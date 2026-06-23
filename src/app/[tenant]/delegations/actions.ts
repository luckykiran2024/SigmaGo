'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { revalidatePath } from 'next/cache';

export async function createDelegationAction(
  tenantSubdomain: string,
  data: {
    delegatorId: string;
    delegateId: string;
    startsAt: string | null;
    endsAt: string | null;
    openEnded: boolean;
    isSelfService: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    throw new Error('User profile not found');
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
  if (data.isSelfService) {
    if (data.delegatorId !== profile.id) {
      throw new Error('Unauthorized: You can only create delegations for yourself');
    }
  } else {
    if (!isAdmin) {
      throw new Error('Unauthorized: Only admins can delegate on behalf of other users');
    }
  }

  if (data.delegatorId === data.delegateId) {
    throw new Error('A user cannot delegate approvals to themselves');
  }

  const { data: delegateUser } = await adminClient
    .from('users')
    .select('id, status')
    .eq('id', data.delegateId)
    .eq('tenant_id', tenant.id)
    .single();

  if (!delegateUser) {
    throw new Error('Delegate user not found');
  }
  if (delegateUser.status.toLowerCase() === 'inactive') {
    throw new Error('Delegate user must be active');
  }

  const startsAtDate = data.startsAt ? new Date(data.startsAt).toISOString() : new Date().toISOString();
  const endsAtDate = data.openEnded ? null : (data.endsAt ? new Date(data.endsAt).toISOString() : null);

  const { error } = await adminClient
    .from('delegations')
    .insert({
      tenant_id: tenant.id,
      delegator_id: data.delegatorId,
      delegate_id: data.delegateId,
      starts_at: startsAtDate,
      ends_at: endsAtDate,
      status: 'active',
      created_by: profile.id
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${tenantSubdomain}/delegations`);
  revalidatePath(`/${tenantSubdomain}/admin/delegations`);
}

export async function revokeDelegationAction(
  tenantSubdomain: string,
  delegationId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    throw new Error('User profile not found');
  }

  const { data: delegation } = await adminClient
    .from('delegations')
    .select('delegator_id')
    .eq('id', delegationId)
    .eq('tenant_id', tenant.id)
    .single();

  if (!delegation) {
    throw new Error('Delegation not found');
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
  const isDelegator = delegation.delegator_id === profile.id;

  if (!isAdmin && !isDelegator) {
    throw new Error('Unauthorized: Only the delegator or a tenant admin can revoke this delegation');
  }

  const { error } = await adminClient
    .from('delegations')
    .update({ status: 'revoked' })
    .eq('id', delegationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${tenantSubdomain}/delegations`);
  revalidatePath(`/${tenantSubdomain}/admin/delegations`);
}
