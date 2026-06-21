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
  action:        'approved' | 'rejected'
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
      .lte('starts_at', new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .limit(1)
      .maybeSingle();

    if (!delegation) {
      throw new Error('Unauthorized: You are not the assigned approver or active delegate for this step');
    }
    delegationId = delegation.id;
  }

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

  await adminClient.from('audit_log').insert({
    tenant_id:   payload.tenantId,
    request_id:  step.request_id,
    actor_id:    payload.actorId,
    action_type: `step_${payload.action}`,
    metadata: {
      step_id:       payload.stepId,
      action_source: payload.actionSource,
      condition:     payload.conditionText
    }
  })

  await advanceChain(step.request_id, payload.tenantId)
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
    .select('*')
    .eq('id', requestId)
    .single()

  const canonical = JSON.stringify(request)
  const checksum = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical)
  )
  const checksumHex = Array.from(new Uint8Array(checksum))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  await adminClient
    .from('approval_requests')
    .update({
      status:          'approved',
      finalized_at:    new Date().toISOString(),
      checksum_sha256: checksumHex
    })
    .eq('id', requestId)

  await adminClient.from('audit_log').insert({
    tenant_id:   tenantId,
    request_id:  requestId,
    actor_id:    null,
    action_type: 'request_finalized',
    metadata:    { checksum: checksumHex }
  })
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
