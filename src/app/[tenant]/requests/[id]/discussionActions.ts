'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { advanceChain } from '@/lib/db/steps';
import { revalidatePath } from 'next/cache';

export async function resumeRequestAction(
  tenantSubdomain: string,
  requestId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) throw new Error('Tenant not found');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) throw new Error('User profile not found');

  // Fetch the request status and owner
  const { data: request } = await adminClient
    .from('approval_requests')
    .select('status, owner_id')
    .eq('id', requestId)
    .single();

  if (!request) throw new Error('Request not found');
  if (request.status !== 'in_discussion') {
    throw new Error('This request is not currently in discussion');
  }

  // Fetch steps to check permissions
  const { data: steps } = await adminClient
    .from('approval_steps')
    .select('approver_id')
    .eq('request_id', requestId);

  const pathApproverIds = steps?.map(s => s.approver_id) || [];
  const isOwner = request.owner_id === profile.id;
  const isApprover = pathApproverIds.includes(profile.id);
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';

  if (!isOwner && !isApprover && !isAdmin) {
    throw new Error('Unauthorized: Only the owner, path approvers, or admins can resume the request');
  }

  // 1. Set request status back to 'pending'
  const { error: updateError } = await adminClient
    .from('approval_requests')
    .update({ status: 'pending' })
    .eq('id', requestId);

  if (updateError) throw updateError;

  // 2. Write audit log entry
  await adminClient.from('audit_log').insert({
    tenant_id: tenant.id,
    request_id: requestId,
    actor_id: profile.id,
    action_type: 'request_resumed',
    metadata: {
      summary: `${profile.name} returned the request to review status.`
    }
  });

  // 3. Advance the chain (to reactivate the step and move forward if needed)
  await advanceChain(requestId, tenant.id);

  revalidatePath(`/${tenantSubdomain}/requests/${requestId}`);
  return { success: true };
}
