'use server';

import { adminClient } from '@/lib/supabase/admin';

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
  // 1. Resolve tenant ID first from subdomain
  const { data: tenant, error: tenantErr } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (tenantErr || !tenant) {
    console.error("Error resolving tenant subdomain in searchUsersAction:", tenantErr);
    return [];
  }

  const tenantId = tenant.id;

  // 2. Query public.users
  let builder = adminClient
    .from('users')
    .select('id, name, email, employee_id, designation')
    .eq('tenant_id', tenantId);

  if (activeOnly) {
    builder = builder.eq('status', 'active');
  }

  // Handle query filtering
  const trimmed = (query || '').trim();
  if (trimmed) {
    builder = builder.or(`name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,employee_id.ilike.%${trimmed}%`);
  }

  // Handle exclusions
  if (excludeIds && excludeIds.length > 0) {
    builder = builder.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  // Capped at 9 results (to know if there are more than 8 matches)
  const { data, error } = await builder.limit(9);

  if (error) {
    console.error("Error searching users in searchUsersAction:", error);
    return [];
  }

  return data as PickableUser[];
}

export async function getUserByIdAction(id: string): Promise<PickableUser | null> {
  if (!id) return null;
  const { data, error } = await adminClient
    .from('users')
    .select('id, name, email, employee_id, designation')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user by id in getUserByIdAction:", error);
    return null;
  }
  return data as PickableUser | null;
}
