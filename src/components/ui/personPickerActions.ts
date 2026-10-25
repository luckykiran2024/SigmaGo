'use server';

import { adminClient } from '@/lib/supabase/admin';
import { requireTenantMember } from '@/lib/auth/guards';

export interface PickableUser {
  id: string;
  name: string;
  email: string;
  employee_id: string | null;
  designation: string | null;
}

export async function searchUsersAction(
  query: string,
  tenantSubdomain: string,
  excludeIds: string[] = [],
  activeOnly: boolean = true
): Promise<PickableUser[]> {
  const { tenantId } = await requireTenantMember(tenantSubdomain);

  // 2. Query public.users
  let builder = adminClient
    .from('users')
    .select('id, name, email, employee_id, designation')
    .eq('tenant_id', tenantId);

  if (activeOnly) {
    builder = builder.eq('status', 'active');
  }

  // Handle query filtering
  const trimmed = (query || '').trim().slice(0, 80).replace(/[^\p{L}\p{N} @_-]/gu, '');
  if (trimmed) {
    builder = builder.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,employee_id.ilike.%${trimmed}%`);
  }

  // Handle exclusions
  if (excludeIds && excludeIds.length > 0) {
    const safeIds = excludeIds.filter(id => /^[0-9a-f-]{36}$/i.test(id));
    if (safeIds.length) builder = builder.not('id', 'in', `(${safeIds.join(',')})`);
  }

  // Capped at 9 results (to know if there are more than 8 matches)
  const { data, error } = await builder.limit(9);

  if (error) {
    console.error("Error searching users in searchUsersAction:", error);
    return [];
  }

  return data as PickableUser[];
}

export async function getUserByIdAction(id: string, tenantSubdomain: string): Promise<PickableUser | null> {
  const { tenantId } = await requireTenantMember(tenantSubdomain);
  if (!id) return null;
  const { data, error } = await adminClient
    .from('users')
    .select('id, name, email, employee_id, designation')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user by id in getUserByIdAction:", error);
    return null;
  }
  return data as PickableUser | null;
}
