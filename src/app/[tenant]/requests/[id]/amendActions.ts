'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { advanceChain } from '@/lib/db/steps';
import { revalidatePath } from 'next/cache';

export async function amendPathAction(
  tenantSubdomain: string,
  requestId: string,
  newPendingSteps: Array<{
    id?: string;
    approverId: string;
    type: 'GENERAL' | 'PARALLEL' | 'REFERENCE';
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  // Load tenant
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();
  if (!tenant) throw new Error('Tenant not found');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) throw new Error('User profile not found');

  // Verify Role & Authorization
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';

  // Fetch current steps
  const { data: currentSteps, error: fetchStepsError } = await adminClient
    .from('approval_steps')
    .select('*')
    .eq('request_id', requestId);

  if (fetchStepsError || !currentSteps) throw new Error('Failed to load request steps');

  // Identify active Direct approver
  let activeDirectApproverId = null;
  const activeDirectStep = currentSteps.find(s => s.status === 'pending' && s.type === 'GENERAL');
  if (activeDirectStep) {
    activeDirectApproverId = activeDirectStep.approver_id;
  }

  const isActorActiveDirectApprover = profile.id === activeDirectApproverId;

  if (!isAdmin && !isActorActiveDirectApprover) {
    throw new Error('Unauthorized - Only the active Direct Approver or an Admin can amend the path');
  }

  // Separate acted and pending steps
  const actedSteps = currentSteps.filter(s => s.status === 'approved' || s.status === 'rejected' || s.status === 'skipped');
  const originalPendingSteps = currentSteps.filter(s => s.status === 'pending' || s.status === 'waiting');

  // Recalculate combined path
  // Combined list consists of: Acted steps first (frozen), then New pending steps
  const combinedStepsInput = [
    ...actedSteps.map(s => ({
      id: s.id,
      approverId: s.approver_id,
      type: s.type,
      status: s.status
    })),
    ...newPendingSteps.map(s => ({
      id: s.id,
      approverId: s.approverId,
      type: s.type,
      status: 'waiting' // reset/initialize all modified steps as waiting
    }))
  ];

  // Derive stage_index and order_index for the entire combined sequence
  let currentDirectStage = -1;
  const updatedSteps = combinedStepsInput.map(step => {
    let stageIndex = 0;
    let orderIndex = 0;

    if (step.type === 'GENERAL') {
      currentDirectStage++;
      stageIndex = currentDirectStage;
      orderIndex = 0;
    } else if (step.type === 'PARALLEL') {
      stageIndex = Math.max(0, currentDirectStage);
      orderIndex = 1;
    } else if (step.type === 'REFERENCE') {
      stageIndex = 0;
      orderIndex = 2;
    }

    return {
      ...step,
      stage_index: stageIndex,
      order_index: orderIndex
    };
  });

  // Validation Check 1: Must have at least one GENERAL step
  const hasDirect = updatedSteps.some(s => s.type === 'GENERAL');
  if (!hasDirect) {
    throw new Error('Validation Failed: The path must contain at least one Direct Approver.');
  }

  // Validation Check 2: First GENERAL step must be before any PARALLEL steps
  const firstDirectIndex = updatedSteps.findIndex(s => s.type === 'GENERAL');
  const firstParallelIndex = updatedSteps.findIndex(s => s.type === 'PARALLEL');
  if (firstParallelIndex !== -1 && (firstDirectIndex === -1 || firstParallelIndex < firstDirectIndex)) {
    throw new Error('Validation Failed: A Parallel Approver cannot be placed before the first Direct Approver.');
  }

  // Validation Check 3: Request owner must not be in the path
  const { data: request } = await adminClient
    .from('approval_requests')
    .select('owner_id')
    .eq('id', requestId)
    .single();

  if (!request) throw new Error('Request not found');

  const includesOwner = updatedSteps.some(s => s.approverId === request.owner_id);
  if (includesOwner) {
    throw new Error('Validation Failed: You cannot include the request owner in the approval path.');
  }

  // Write changes to database:
  // 1. Delete removed pending steps
  const keepIds = new Set(newPendingSteps.map(s => s.id).filter(Boolean));
  const stepsToDelete = originalPendingSteps.filter(s => !keepIds.has(s.id));
  if (stepsToDelete.length > 0) {
    const { error: deleteError } = await adminClient
      .from('approval_steps')
      .delete()
      .in('id', stepsToDelete.map(s => s.id));
    if (deleteError) throw deleteError;
  }

  // 2. Insert or update pending/waiting steps and refresh their statuses to 'waiting'
  for (const step of updatedSteps) {
    if (actedSteps.some(as => as.id === step.id)) {
      // Acted steps are frozen, do not modify in DB
      continue;
    }

    if (step.id) {
      // Update existing pending step
      const { error: updateError } = await adminClient
        .from('approval_steps')
        .update({
          approver_id: step.approverId,
          type: step.type,
          stage_index: step.stage_index,
          order_index: step.order_index,
          status: 'waiting' // reset status to waiting to let advanceChain evaluate correctly
        })
        .eq('id', step.id);
      if (updateError) throw updateError;
    } else {
      // Insert new step
      const { error: insertError } = await adminClient
        .from('approval_steps')
        .insert({
          request_id: requestId,
          approver_id: step.approverId,
          type: step.type,
          stage_index: step.stage_index,
          order_index: step.order_index,
          status: 'waiting'
        });
      if (insertError) throw insertError;
    }
  }

  // Ensure request is unlocked if blocked
  const { error: unlockRequestError } = await adminClient
    .from('approval_requests')
    .update({ status: 'pending' })
    .eq('id', requestId);
  if (unlockRequestError) throw unlockRequestError;

  // Run advance logic to activate the first waiting stage
  await advanceChain(requestId, tenant.id);

  // Write audit log entry
  const { data: usersInfo } = await adminClient
    .from('users')
    .select('id, name, employee_id')
    .in('id', [
      profile.id,
      ...currentSteps.map(s => s.approver_id),
      ...updatedSteps.map(s => s.approverId)
    ]);
  const userMap = new Map((usersInfo || []).map(u => [u.id, u]));

  const actorUser = userMap.get(profile.id);
  const actorNameSnapshot = actorUser 
    ? `${actorUser.name} (${actorUser.employee_id || 'N/A'})` 
    : profile.name;

  const originalNames = currentSteps.map(s => {
    const u = userMap.get(s.approver_id);
    return `${u ? u.name : 'Unknown'} (${s.type})`;
  }).join(' ➔ ');

  const newNames = updatedSteps.map(s => {
    const u = userMap.get(s.approverId);
    return `${u ? u.name : 'Unknown'} (${s.type})`;
  }).join(' ➔ ');

  const summary = `Amended approval path. Original: [${originalNames}]. New: [${newNames}].`;

  await adminClient.from('audit_log').insert({
    tenant_id: tenant.id,
    request_id: requestId,
    actor_id: profile.id,
    action_type: 'path_amended',
    metadata: {
      actor_name_snapshot: actorNameSnapshot,
      summary,
      original_path: currentSteps.map(s => ({ approver_id: s.approver_id, type: s.type, status: s.status })),
      new_path: updatedSteps.map(s => ({ approver_id: s.approverId, type: s.type, status: s.status }))
    }
  });

  revalidatePath(`/${tenantSubdomain}/requests/${requestId}`);
  return true;
}
