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
}) {
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
        comment:        payload.comment,
        condition_text: payload.conditionText,
        action_source:  payload.actionSource,
        delegation_id:  delegationId
      })
      .eq('id', payload.stepId)
      .select('request_id')
      .single();

    if (stepError) throw stepError;

    // Set request status to 'in_discussion'
    const { error: reqError } = await adminClient
      .from('approval_requests')
      .update({ status: 'in_discussion' })
      .eq('id', step.request_id);

    if (reqError) throw reqError;

    const { data: users } = await adminClient
      .from('users')
      .select('id, name, employee_id')
      .in('id', [payload.actorId, checkStep.approver_id]);

    const actorUser = users?.find(u => u.id === payload.actorId);
    const approverUser = users?.find(u => u.id === checkStep.approver_id);

    // Fetch request owner email
    const { data: request } = await adminClient
      .from('approval_requests')
      .select('owner_id, owner:users!owner_id(email)')
      .eq('id', step.request_id)
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

    return;
  }

  // Else: Approve or Reject
  const { data: step, error: stepError } = await adminClient
    .from('approval_steps')
    .update({
      status:         payload.action,
      acted_at:       new Date().toISOString(),
      acted_by_id:    payload.actorId,
      comment:        payload.comment,
      condition_text: payload.conditionText,
      action_source:  payload.actionSource,
      delegation_id:  delegationId
    })
    .eq('id', payload.stepId)
    .select('request_id, order_index, type')
    .single();

  if (stepError) throw stepError

  const { data: users } = await adminClient
    .from('users')
    .select('id, name, employee_id')
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
      step_id:       payload.stepId,
      action_source: payload.actionSource,
      condition:     payload.conditionText,
      ...(delegationId ? {
        actor_name_snapshot: actorUser?.name || 'Unknown',
        actor_employee_id_snapshot: actorUser?.employee_id || 'N/A',
        delegator_name_snapshot: approverUser?.name || 'Unknown',
        delegator_employee_id_snapshot: approverUser?.employee_id || 'N/A',
        summary: `${actorUser?.name || 'Unknown'} (${actorUser?.employee_id || 'N/A'}) ${verb} on behalf of ${approverUser?.name || 'Unknown'} (${approverUser?.employee_id || 'N/A'}) as delegate.`
      } : {})
    }
  })

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

    if (!generalStep) continue;

    // A. General step is not approved
    if (generalStep.status !== 'approved') {
      if (generalStep.status === 'waiting') {
        // Activate General step
        await adminClient
          .from('approval_steps')
          .update({ status: 'pending' })
          .eq('id', generalStep.id);

        triggerStepEmail(generalStep.id, tenantId).catch(console.error);
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
          const ids = waitingParallels.map(s => s.id);
          // Activate all waiting parallel steps in this stage
          await adminClient
            .from('approval_steps')
            .update({ status: 'pending' })
            .in('id', ids);

          // Trigger emails
          for (const id of ids) {
            triggerStepEmail(id, tenantId).catch(console.error);
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
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) return;

  const { data: steps } = await adminClient
    .from('approval_steps')
    .select('id, approver_id, type, stage_index, status, acted_at, acted_by_id, comment')
    .eq('request_id', requestId)
    .order('stage_index', { ascending: true })
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });

  const { data: auditLogs } = await adminClient
    .from('audit_log')
    .select('id, action_type, actor_id, metadata, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  const canonicalData = {
    request: {
      id: request.id,
      subject: request.subject,
      body_json: request.body_json,
      owner_id: request.owner_id,
      category_id: request.category_id,
      created_at: request.created_at,
    },
    steps: (steps || []).map(s => ({
      id: s.id,
      approver_id: s.approver_id,
      type: s.type,
      stage_index: s.stage_index,
      status: s.status,
      acted_at: s.acted_at,
      acted_by_id: s.acted_by_id,
      comment: s.comment,
    })),
    audit_log: (auditLogs || []).map(l => ({
      id: l.id,
      action_type: l.action_type,
      actor_id: l.actor_id,
      metadata: l.metadata,
      created_at: l.created_at,
    }))
  };

  const canonical = JSON.stringify(canonicalData);
  const checksum = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical)
  );
  const checksumHex = Array.from(new Uint8Array(checksum))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  await adminClient
    .from('approval_requests')
    .update({
      status:          'approved',
      finalized_at:    new Date().toISOString(),
      checksum_sha256: checksumHex
    })
    .eq('id', requestId);

  await adminClient.from('audit_log').insert({
    tenant_id:   tenantId,
    request_id:  requestId,
    actor_id:    null,
    action_type: 'request_finalized',
    metadata:    { checksum: checksumHex }
  });
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
