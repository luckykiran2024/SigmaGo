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
      .eq('tenant_id', payload.tenantId)
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

  // 2. Attempt atomic transactional execution via PostgreSQL RPC
  let rpcRes: any = null;
  try {
    const { data, error: rpcErr } = await adminClient.rpc('sigmago_act_on_step', {
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
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        throw new Error(`Authoritative transaction failed in database RPC: ${rpcErr.message}`);
      }
      console.warn('RPC sigmago_act_on_step returned error, falling back to application path in development:', rpcErr);
    } else {
      rpcRes = data;
    }
  } catch (rpcException) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw rpcException;
    }
    console.warn('RPC sigmago_act_on_step threw, falling back to application path in development:', rpcException);
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
          .eq('tenant_id', payload.tenantId)
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

  // 3. Fallback application path (for local testing environments without RPC)
  // Verify step is pending and actor is authorized (is direct approver, or has active delegation)
  const { data: checkStep, error: checkError } = await adminClient
    .from('approval_steps')
    .select('approver_id, status')
    .eq('id', payload.stepId)
    .single();

  if (checkError || !checkStep) {
    throw new Error('Approval step not found');
  }

  if (checkStep.status !== 'pending') {
    throw new Error('Approval step is not pending');
  }

  let delegationId = payload.delegationId;

  if (checkStep.approver_id !== payload.actorId) {
    // Check for active delegation
    const { data: delegation } = await adminClient
      .from('delegations')
      .select('id')
      .eq('tenant_id', payload.tenantId)
      .eq('delegator_id', checkStep.approver_id)
      .eq('delegate_id', payload.actorId)
      .eq('status', 'active')
      .filter('', 'and', `(or(starts_at.is.null,starts_at.lte.${new Date().toISOString()}),or(ends_at.is.null,ends_at.gt.${new Date().toISOString()}))`)
      .limit(1)
      .maybeSingle();

    if (!delegation) {
      throw new Error('Unauthorized: You are not the assigned approver or active delegate for this step');
    }
    delegationId = delegation.id;
  }

  if (payload.action === 'discuss') {
    const { data: step, error: stepError } = await adminClient
      .from('approval_steps')
      .update({
        stance:          stance,
        outcome:         outcome,
        was_binding:     wasBinding,
        reservation_note: reservationNote,
        reasoning_length: (payload.comment || '').trim().length,
        comment:         payload.comment,
        condition_text:  payload.conditionText,
        action_source:   payload.actionSource,
        delegation_id:   delegationId
      })
      .eq('id', payload.stepId)
      .select('request_id')
      .single();

    if (stepError) throw stepError;

    // Set request status to 'in_discussion'
    const { error: reqError } = await adminClient
      .from('approval_requests')
      .update({ status: 'in_discussion' })
      .eq('id', step.request_id)
      .eq('tenant_id', payload.tenantId);

    if (reqError) throw reqError;

    const { data: users } = await adminClient
      .from('users')
      .select('id, name, employee_id')
      .eq('tenant_id', payload.tenantId)
      .in('id', [payload.actorId, checkStep.approver_id]);

    const actorUser = users?.find(u => u.id === payload.actorId);
    const approverUser = users?.find(u => u.id === checkStep.approver_id);

    // Fetch request owner email
    const { data: request } = await adminClient
      .from('approval_requests')
      .select('owner_id, owner:users!owner_id(email)')
      .eq('id', step.request_id)
      .eq('tenant_id', payload.tenantId)
      .single();

    const ownerEmail = (request?.owner as any)?.email;

    // Email request owner
    const { sendDiscussionNotificationEmail } = await import('../email/outbound');
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('subdomain')
      .eq('id', payload.tenantId)
      .single();

    if (ownerEmail && tenant) {
      await sendDiscussionNotificationEmail(
        tenant.subdomain,
        step.request_id,
        payload.comment || 'No comment provided.',
        actorUser?.name || 'An approver',
        ownerEmail
      ).catch(console.error);
    }

    // Write audit log
    await adminClient.from('audit_log').insert({
      tenant_id:   payload.tenantId,
      request_id:  step.request_id,
      actor_id:    payload.actorId,
      action_type: 'step_discussion',
      metadata: {
        step_id:       payload.stepId,
        stance:        stance,
        outcome:       outcome,
        was_binding:   wasBinding,
        reservation_note: reservationNote,
        action_source: payload.actionSource,
        condition:     payload.conditionText,
        comment:       payload.comment,
        ...(delegationId ? {
          actor_name_snapshot: actorUser?.name || 'Unknown',
          actor_employee_id_snapshot: actorUser?.employee_id || 'N/A',
          delegator_name_snapshot: approverUser?.name || 'Unknown',
          delegator_employee_id_snapshot: approverUser?.employee_id || 'N/A',
          summary: `${actorUser?.name || 'Unknown'} (${actorUser?.employee_id || 'N/A'}) requested discussion via ${payload.actionSource} on behalf of ${approverUser?.name || 'Unknown'} (${approverUser?.employee_id || 'N/A'}) as delegate.`
        } : {
          summary: `${actorUser?.name || 'Unknown'} (${actorUser?.employee_id || 'N/A'}) requested discussion via ${payload.actionSource}.`
        })
      }
    });

    const { emitDecisionEvent } = await import('@/lib/intelligence/events/emit');
    await emitDecisionEvent({
      tenantId: payload.tenantId,
      requestId: step.request_id,
      stepId: payload.stepId,
      eventType: 'STEP_CHANGES_REQUESTED',
      actorId: payload.actorId,
      stance: stance,
      outcome: outcome,
      wasBinding: wasBinding,
      eventPayload: { comment: payload.comment, condition: payload.conditionText }
    });

    return;
  }

  // Else: Approve or Reject
  const { data: step, error: stepError } = await adminClient
    .from('approval_steps')
    .update({
      status:          payload.action,
      stance:          stance,
      outcome:         outcome,
      was_binding:     wasBinding,
      reservation_note: reservationNote,
      reasoning_length: (payload.comment || '').trim().length,
      acted_at:        new Date().toISOString(),
      acted_by_id:     payload.actorId,
      comment:         payload.comment,
      condition_text:  payload.conditionText || reservationNote,
      action_source:   payload.actionSource,
      delegation_id:   delegationId
    })
    .eq('id', payload.stepId)
    .select('request_id, order_index, type')
    .single();

  if (stepError) throw stepError

  const { data: users } = await adminClient
    .from('users')
    .select('id, name, employee_id')
    .eq('tenant_id', payload.tenantId)
    .in('id', [payload.actorId, checkStep.approver_id]);

  const actorUser = users?.find(u => u.id === payload.actorId);
  const approverUser = users?.find(u => u.id === checkStep.approver_id);
  const verb = payload.action === 'approved' ? 'approved' : 'rejected';

  await adminClient.from('audit_log').insert({
    tenant_id:   payload.tenantId,
    request_id:  step.request_id,
    actor_id:    payload.actorId,
    action_type: `step_${payload.action}`,
    metadata: {
      step_id:          payload.stepId,
      stance:           stance,
      outcome:          outcome,
      was_binding:      wasBinding,
      reservation_note: reservationNote,
      action_source:    payload.actionSource,
      condition:        payload.conditionText,
      ...(delegationId ? {
        actor_name_snapshot: actorUser?.name || 'Unknown',
        actor_employee_id_snapshot: actorUser?.employee_id || 'N/A',
        delegator_name_snapshot: approverUser?.name || 'Unknown',
        delegator_employee_id_snapshot: approverUser?.employee_id || 'N/A',
        summary: `${actorUser?.name || 'Unknown'} (${actorUser?.employee_id || 'N/A'}) ${verb} on behalf of ${approverUser?.name || 'Unknown'} (${approverUser?.employee_id || 'N/A'}) as delegate.`
      } : {})
    }
  });

  const { emitDecisionEvent } = await import('@/lib/intelligence/events/emit');
  await emitDecisionEvent({
    tenantId: payload.tenantId,
    requestId: step.request_id,
    stepId: payload.stepId,
    eventType: payload.action === 'approved' ? 'STEP_APPROVED' : 'STEP_REJECTED',
    actorId: payload.actorId,
    stance: stance,
    outcome: outcome,
    wasBinding: wasBinding,
    eventPayload: { comment: payload.comment, condition: payload.conditionText || reservationNote }
  });

  await advanceChain(step.request_id, payload.tenantId)
}

export async function advanceChain(requestId: string, tenantId: string) {
  // Check if request is currently in discussion
  const { data: request, error: reqError } = await adminClient
    .from('approval_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  if (reqError || !request) return;
  if (request.status === 'in_discussion') {
    // Discussion loop active. Bail.
    return;
  }

  // Fetch all steps for this request
  const { data: steps, error } = await adminClient
    .from('approval_steps')
    .select('*')
    .eq('request_id', requestId)
    .eq('tenant_id', tenantId);

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
  ).sort((a, b) => a - b);

  // If there are no approval stages, or all are reference steps, we finalize the request
  if (stages.length === 0) {
    await finalizeRequest(requestId, tenantId);
    return;
  }

  // 3. Process each stage in order
  for (const stageVal of stages) {
    const generalStep = steps.find(s => s.stage_index === stageVal && s.type === 'GENERAL');
    const parallelSteps = steps.filter(s => s.stage_index === stageVal && s.type === 'PARALLEL');

    // A. General step evaluation if present
    if (generalStep) {
      if (generalStep.status !== 'approved') {
        if (generalStep.status === 'waiting') {
          // Activate General step with fresh entered_at (§4)
          await adminClient
            .from('approval_steps')
            .update({ status: 'pending', entered_at: new Date().toISOString() })
            .eq('id', generalStep.id)
            .eq('tenant_id', tenantId);

          triggerStepEmail(generalStep.id, tenantId).catch(console.error);

          const { emitDecisionEvent } = await import('@/lib/intelligence/events/emit');
          await emitDecisionEvent({
            tenantId,
            requestId,
            stepId: generalStep.id,
            eventType: 'STEP_ENTERED',
            actorId: generalStep.approver_id,
            eventPayload: { stageIndex: generalStep.stage_index, approverId: generalStep.approver_id }
          });
        }
        // General step is active (either just activated or already pending). Stop execution so subsequent stages remain waiting.
        return;
      }
    }

    // B. Parallel steps evaluation if present
    if (parallelSteps.length > 0) {
      const allParallelsApproved = parallelSteps.every(s => s.status === 'approved');
      if (!allParallelsApproved) {
        const waitingParallels = parallelSteps.filter(s => s.status === 'waiting');
        if (waitingParallels.length > 0) {
          const ids = waitingParallels.map(s => s.id);
          // Activate all waiting parallel steps in this stage with fresh entered_at (§4)
          await adminClient
            .from('approval_steps')
            .update({ status: 'pending', entered_at: new Date().toISOString() })
            .in('id', ids)
            .eq('tenant_id', tenantId);

          const { emitDecisionEvent } = await import('@/lib/intelligence/events/emit');
          // Trigger emails and emit STEP_ENTERED
          for (const s of waitingParallels) {
            triggerStepEmail(s.id, tenantId).catch(console.error);
            await emitDecisionEvent({
              tenantId,
              requestId,
              stepId: s.id,
              eventType: 'STEP_ENTERED',
              actorId: s.approver_id,
              eventPayload: { stageIndex: s.stage_index, approverId: s.approver_id }
            });
          }
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

  // The database status is transitioned to 'approved' atomically inside sigmago_finalize_seal
  // called by generateChecksumAndFinalize. We emit the decision events here:
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

  await emitDecisionEvent({
    tenantId: tenantId,
    requestId: requestId,
    workflowId: request?.workflow_id || null,
    workflowVersionId: request?.workflow_version_id || null,
    eventType: 'REQUEST_SEALED',
    baselineStepType: request?.baseline_step_type || null,
    resolvedStepType: request?.resolved_step_type || null,
    eventPayload: { checksum: checksumHex, algorithm: 'SHA-256', canonicalVersion: 2 }
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
