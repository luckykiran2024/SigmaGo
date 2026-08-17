import { describe, it, expect, vi } from 'vitest';

// Role capabilities matrix under test
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
};

function checkRolePermission(role: string, action: string): boolean {
  const allowed = ROLE_PERMISSIONS[role.toLowerCase()] || ROLE_PERMISSIONS.member;
  if (allowed.includes('*')) return true;
  return allowed.includes(action);
}

describe('RBAC Permissions Capabilities Engine', () => {
  it('should grant full wildcard access to super_admin', () => {
    expect(checkRolePermission('super_admin', 'tenant:manage')).toBe(true);
    expect(checkRolePermission('super_admin', 'any:action')).toBe(true);
  });

  it('should grant administrative capabilities to admin role', () => {
    expect(checkRolePermission('admin', 'request:create')).toBe(true);
    expect(checkRolePermission('admin', 'user:manage')).toBe(true);
    expect(checkRolePermission('admin', 'category:manage')).toBe(true);
  });

  it('should restrict member role from administrative actions', () => {
    expect(checkRolePermission('member', 'request:create')).toBe(true);
    expect(checkRolePermission('member', 'tenant:manage')).toBe(false);
    expect(checkRolePermission('member', 'user:manage')).toBe(false);
  });
});
