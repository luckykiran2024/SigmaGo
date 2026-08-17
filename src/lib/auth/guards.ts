import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';

export interface GuardContext {
  user: any;
  profile: any;
  tenantId: string;
  subdomain: string;
}

/**
 * Asserts that the current user is authenticated, belongs to the specified tenant,
 * and possesses tenant administrator privileges (admin or super_admin).
 */
export async function requireTenantAdmin(tenantSubdomain: string): Promise<GuardContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  // Concurrently resolve tenant data and user profile to eliminate DB query waterfalls
  const [tenantRes, profile] = await Promise.all([
    adminClient
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', tenantSubdomain)
      .single(),
    getProfileForAuthUser(user.id, user.email || '')
  ]);

  const tenantData = tenantRes.data;

  if (!tenantData) {
    throw new Error('Tenant not found');
  }

  if (!profile) {
    throw new Error('Unauthorized: User profile not found');
  }

  // Systemic Tenant Isolation Check (C2 Fix): Profile tenant_id MUST match target tenant_id
  if (profile.tenant_id !== tenantData.id) {
    throw new Error('Forbidden: User does not belong to this tenant');
  }

  // Role Check
  const role = (profile.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Forbidden: Tenant Administrator access required');
  }

  return {
    user,
    profile,
    tenantId: tenantData.id,
    subdomain: tenantData.subdomain
  };
}

/**
 * Asserts that the current user is authenticated and belongs to the specified tenant.
 */
export async function requireTenantMember(tenantSubdomain: string): Promise<GuardContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  // Concurrently resolve tenant data and user profile
  const [tenantRes, profile] = await Promise.all([
    adminClient
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', tenantSubdomain)
      .single(),
    getProfileForAuthUser(user.id, user.email || '')
  ]);

  const tenantData = tenantRes.data;

  if (!tenantData) {
    throw new Error('Tenant not found');
  }

  if (!profile) {
    throw new Error('Unauthorized: User profile not found');
  }

  // Systemic Tenant Isolation Check (C2 Fix)
  if (profile.tenant_id !== tenantData.id) {
    throw new Error('Forbidden: User does not belong to this tenant');
  }

  return {
    user,
    profile,
    tenantId: tenantData.id,
    subdomain: tenantData.subdomain
  };
}

/**
 * Asserts that the user belongs to the tenant AND is an Admin or HR personnel.
 */
export async function requireHRorAdmin(tenantSubdomain: string): Promise<GuardContext> {
  const ctx = await requireTenantMember(tenantSubdomain);
  
  const role = (ctx.profile.role || '').toLowerCase();
  const dept = ((ctx.profile as any).department || '').toLowerCase();
  const desig = ((ctx.profile as any).designation || '').toLowerCase();

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isHR = dept.includes('hr') || dept.includes('human resources') || desig.includes('hr') || role === 'hr';

  if (!isAdmin && !isHR) {
    throw new Error('Forbidden: Admin or HR privileges required');
  }

  return ctx;
}
