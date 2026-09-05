import { createClient } from '../supabase/server'
import { adminClient } from '../supabase/admin'

export async function getMyPendingSteps(userId: string, tenantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('approval_steps')
    .select(`
      id, type, order_index,
      approval_requests!inner (
        id, ref, subject, status, created_at,
        categories ( name ),
        users!owner_id ( name, email )
      )
    `)
    .eq('approver_id', userId)
    .eq('status', 'pending')
    .eq('approval_requests.tenant_id', tenantId)
    .order('created_at', {
      referencedTable: 'approval_requests',
      ascending: true
    })

  if (error) throw error
  return data
}

export async function actOnStep(payload: {
  stepId:        string
  action:        'approved' | 'rejected' | 'discuss'
  actorId:       string
  tenantId:      string
  comment?:      string
  conditionText?: string
  actionSource:  'web' | 'email' | 'digest'
  delegationId?: string
  stance?:       'ENDORSED' | 'APPROVED_WITH_RESERVATION' | 'REJECTED' | 'CHANGES_REQUESTED'
  reservationNote?: string
  wasBinding?:   boolean
  idempotencyKey?: string
}) {
  // 1. Idempotency check: Return existing step if already processed with this key
  if (payload.idempotencyKey) {
    const { data: existingStep } = await adminClient
      .from('approval_steps')
      .select('id, status, acted_at')
      .eq('idempotency_key', payload.idempotencyKey)
      .maybeSingle();

    if (existingStep) {
      return {
        success: true,
        alreadyProcessed: true,
        stepId: existingStep.id,
        status: existingStep.status,
      };
    }
  }

  let stance: 'ENDORSED' | 'APPROVED_WITH_RESERVATION' | 'REJECTED' | 'CHANGES_REQUESTED';
  let outcome: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'CHANGES_REQUESTED' | 'DELEGATED';
  const wasBinding = payload.wasBinding !== undefined ? payload.wasBinding : true;
  let reservationNote = payload.reservationNote || null;

  if (payload.action === 'discuss') {
    stance = 'CHANGES_REQUESTED';
    outcome = 'CHANGES_REQUESTED';
  } else if (payload.action === 'rejected') {
    stance = payload.stance || 'REJECTED';
    outcome = 'REJECTED';
  } else {
    // action === 'approved'
    const hasReservation = payload.stance === 'APPROVED_WITH_RESERVATION' ||
      Boolean(reservationNote && reservationNote.trim().length > 0) ||
      Boolean(payload.conditionText && payload.conditionText.trim().length > 0);

    if (hasReservation) {
      stance = 'APPROVED_WITH_RESERVATION';
      outcome = 'APPROVED_WITH_CONDITIONS';
      reservationNote = reservationNote || payload.conditionText || payload.comment || null;
      if (!reservationNote || reservationNote.trim().length === 0) {
        throw new Error('Reservation note is required when approving with reservation or conditions.');
      }
    } else {
      stance = payload.stance || 'ENDORSED';
      outcome = 'APPROVED';
    }
  }

  // 2. Authoritative atomic transactional execution via PostgreSQL RPC
  const { data: rpcRes, error: rpcErr } = await adminClient.rpc('sigmago_act_on_step', {
    p_step_id: payload.stepId,
    p_actor_id: payload.actorId,
    p_tenant_id: payload.tenantId,
    p_action: payload.action,
    p_stance: stance,
    p_outcome: outcome,
    p_was_binding: wasBinding,
    p_reservation_note: reservationNote,
    p_comment: payload.comment || null,
    p_condition_text: payload.conditionText || null,
    p_action_source: payload.actionSource,
    p_delegation_id: payload.delegationId || null,
    p_idempotency_key: payload.idempotencyKey || null,
  });

  if (rpcErr) {
    throw new Error(`Authoritative transaction failed in database RPC sigmago_act_on_step: ${rpcErr.message}`);
  }

  if (rpcRes) {
    if (rpcRes.already_processed) {
      return {
        success: true,
        alreadyProcessed: true,
        stepId: rpcRes.step_id,
        status: rpcRes.status,
      };
    }

    // Two-Phase Finalization: if final stage, seal with non-null cryptographic checksum
    if ((rpcRes.finalized || rpcRes.needs_seal || rpcRes.request_status === 'FINALIZING') && rpcRes.request_id) {
      await finalizeRequest(rpcRes.request_id, payload.tenantId);
    } else if (rpcRes.stage_advanced && rpcRes.next_stage_index !== undefined) {
      try {
        const { data: nextSteps } = await adminClient
          .from('approval_steps')
          .select('id')
          .eq('request_id', rpcRes.request_id)
          .eq('stage_index', rpcRes.next_stage_index)
          .eq('status', 'pending');

        for (const ns of nextSteps || []) {
          triggerStepEmail(ns.id, payload.tenantId).catch(console.error);
        }
      } catch (err) {
        console.error('Non-blocking: Failed to trigger next stage notification emails:', err);
      }
    }

    if (payload.action === 'discuss' && rpcRes.request_id) {
      try {
        const { data: request } = await adminClient
          .from('approval_requests')
          .select('owner_id, owner:users!owner_id(email)')
          .eq('id', rpcRes.request_id)
          .single();

        const ownerEmail = (request?.owner as any)?.email;
        const { data: tenant } = await adminClient
          .from('tenants')
          .select('subdomain')
          .eq('id', payload.tenantId)
          .single();

        if (ownerEmail && tenant) {
          const { sendDiscussionNotificationEmail } = await import('../email/outbound');
          await sendDiscussionNotificationEmail(
            tenant.subdomain,
            rpcRes.request_id,
            payload.comment || 'No comment provided.',
            'An approver',
            ownerEmail
          ).catch(console.error);
        }
      } catch (e) {
        console.error('Error triggering discussion email:', e);
      }
    }

    return {
      success: true,
      ...rpcRes,
    };
  }

}

export async function advanceChain(requestId: string, tenantId: string) {
  // Fetch all steps for this request
  const { data: steps, error } = await adminClient
    .from('approval_steps')
    .select('*')
    .eq('request_id', requestId);

  if (error) throw error;
  if (!steps || steps.length === 0) return;

  // 1. If any non-reference step is rejected, mark request as rejected
  const hasRejection = steps.some(s => s.status === 'rejected' && s.type !== 'REFERENCE');
  if (hasRejection) {
    await rejectRequest(requestId, tenantId);
    return;
  }

  // 2. Identify the unique stage indices (excluding REFERENCE steps)
  const stages = Array.from(
    new Set(
      steps
        .filter(s => s.type !== 'REFERENCE' && s.stage_index !== null && s.stage_index !== undefined)
        .map(s => s.stage_index)
    )
  ).sort((a: any, b: any) => a - b);

  // If there are no approval stages, or all are reference steps, we finalize the request
  if (stages.length === 0) {
    await finalizeRequest(requestId, tenantId);
    return;
  }

  // 3. Process each stage in order
  for (const stageVal of stages) {
    const generalStep = steps.find(s => s.stage_index === stageVal && s.type === 'GENERAL');
    const parallelSteps = steps.filter(s => s.stage_index === stageVal && s.type === 'PARALLEL');

    if (!generalStep) continue;

    // A. General step is not approved
    if (generalStep.status !== 'approved') {
      if (generalStep.status === 'waiting') {
        // Activate General step
        await adminClient
          .from('approval_steps')
          .update({ status: 'pending' })
          .eq('id', generalStep.id);
      }
      // General step is active (either we just set it to pending, or it was already pending)
      // Stop execution so subsequent stages remain waiting.
      return;
    }

    // B. General step is approved. Check parallel steps.
    if (parallelSteps.length > 0) {
      const allParallelsApproved = parallelSteps.every(s => s.status === 'approved');
      if (!allParallelsApproved) {
        const waitingParallels = parallelSteps.filter(s => s.status === 'waiting');
        if (waitingParallels.length > 0) {
          // Activate all waiting parallel steps in this stage
          await adminClient
            .from('approval_steps')
            .update({ status: 'pending' })
            .in('id', waitingParallels.map(s => s.id));
        }
        // At least one parallel step is active (pending). Wait.
        return;
      }
    }

    // C. General and all parallel steps in this stage are approved.
    // Move to the next stage in the loop.
  }

  // 4. All stages fully approved! Finalize the request.
  await finalizeRequest(requestId, tenantId);
}

async function finalizeRequest(requestId: string, tenantId: string) {
  const { data: request } = await adminClient
    .from('approval_requests')
    .select('workflow_id, workflow_version_id, baseline_step_type, resolved_step_type')
    .eq('id', requestId)
    .single();

  const { generateChecksumAndFinalize } = await import('@/lib/certificate');
  const finalizeRes = await generateChecksumAndFinalize(requestId, tenantId);

  if (!finalizeRes || !finalizeRes.checksum) {
    const errMsg = `FATAL: Cryptographic sealing failed for request ${requestId}. Refusing to transition to 'approved' without a non-null SHA-256 seal. Request remains in 'FINALIZING' state for investigation.`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const checksumHex = finalizeRes.checksum;

  // The database status is transitioned to 'approved' and authoritative 'REQUEST_SEALED'
  // event is inserted atomically inside sigmago_finalize_seal.
  // We record the high-level workflow finalization event:
  const { emitDecisionEvent } = await import('@/lib/intelligence/events/emit');
  await emitDecisionEvent({
    tenantId: tenantId,
    requestId: requestId,
    workflowId: request?.workflow_id || null,
    workflowVersionId: request?.workflow_version_id || null,
    eventType: 'REQUEST_FINALIZED',
    baselineStepType: request?.baseline_step_type || null,
    resolvedStepType: request?.resolved_step_type || null,
    eventPayload: { checksum: checksumHex, status: 'approved' }
  });

  return finalizeRes;
}

async function rejectRequest(requestId: string, tenantId: string) {
  const { data: request } = await adminClient
    .from('approval_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  if (request && request.status !== 'rejected') {
    await adminClient
      .from('approval_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    await adminClient.from('audit_log').insert({
      tenant_id:   tenantId,
      request_id:  requestId,
      actor_id:    null,
      action_type: 'request_rejected',
      metadata:    {}
    });
  }
}


async function triggerStepEmail(stepId: string, tenantId: string) {
  try {
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('subdomain')
      .eq('id', tenantId)
      .single();
    
    if (!tenant) return;

    const { data: step } = await adminClient
      .from('approval_steps')
      .select('id, approver:users!approver_id(email)')
      .eq('id', stepId)
      .single();

    const email = (step?.approver as any)?.email;
    if (email) {
      const { sendApprovalActionEmail } = await import('../email/outbound');
      await sendApprovalActionEmail(tenant.subdomain, stepId, email);
    }
  } catch (err) {
    console.error("Failed to trigger step email:", err);
  }
}
