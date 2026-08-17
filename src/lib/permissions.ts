import { adminClient } from '@/lib/supabase/admin';

export type PermissionAction =
  | 'request:create'
  | 'request:read'
  | 'request:approve'
  | 'request:delete'
  | 'user:view'
  | 'user:manage'
  | 'category:manage'
  | 'tenant:manage'
  | 'settings:manage'
  | 'hr:manage'
  | 'view_grants:manage';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: [
    'request:create',
    'request:read',
    'request:approve',
    'request:delete',
    'user:view',
    'user:manage',
    'category:manage',
    'tenant:manage',
    'settings:manage',
    'hr:manage',
    'view_grants:manage',
  ],
  hr: [
    'request:create',
    'request:read',
    'request:approve',
    'user:view',
    'hr:manage',
  ],
  member: [
    'request:create',
    'request:read',
    'request:approve',
    'user:view',
  ],
  user: [
    'request:create',
    'request:read',
    'request:approve',
    'user:view',
  ],
};

/**
 * Checks whether a given user in a tenant has permission to perform a specific action.
 */
export async function checkPermission(
  userId: string,
  tenantId: string,
  action: PermissionAction | string
): Promise<boolean> {
  try {
    if (!userId || !tenantId || !action) {
      return false;
    }

    // 1. Query user profile from database
    const { data: userProfile, error } = await adminClient
      .from('users')
      .select('id, tenant_id, role, status, department')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !userProfile) {
      console.warn(`checkPermission: User profile not found for user ${userId} in tenant ${tenantId}`);
      return false;
    }

    // 2. Reject inactive accounts
    if (userProfile.status === 'inactive') {
      return false;
    }

    // 3. Resolve user role
    const role = (userProfile.role || 'member').toLowerCase();
    const allowedActions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member;

    // 4. Wildcard matching for super_admin
    if (allowedActions.includes('*')) {
      return true;
    }

    // 5. Explicit action match
    if (allowedActions.includes(action)) {
      return true;
    }

    // 6. Special HR department check for hr actions
    const dept = (userProfile.department || '').toLowerCase();
    if (dept.includes('hr') || dept.includes('human resources')) {
      if (action === 'hr:manage' || action === 'user:view') {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('checkPermission error:', err);
    return false;
  }
}

