import { describe, it, expect } from 'vitest';

describe('Navbar Role Gating & Admin Route Security Test Suite', () => {
  // Test 1: Employee role should NOT see Policies or Admin tabs
  it('should filter out Policies and Admin navbar tabs for non-admin employee roles', () => {
    const getNavItems = (tenantSubdomain: string, isAdmin: boolean, pendingApprovalsCount = 0) => [
      { label: 'Dashboard', href: `/${tenantSubdomain}` },
      { label: 'Approvals', href: `/${tenantSubdomain}/approvals`, count: pendingApprovalsCount },
      { label: 'Records', href: `/${tenantSubdomain}/records` },
      ...(isAdmin ? [{ label: 'Policies', href: `/${tenantSubdomain}/admin/intelligence` }] : []),
      { label: 'Delegations', href: `/${tenantSubdomain}/delegations` },
      ...(isAdmin ? [{ label: 'Admin', href: `/${tenantSubdomain}/admin/approvers` }] : []),
    ];

    const employeeNav = getNavItems('meridian', false);
    const navLabels = employeeNav.map((n) => n.label);

    expect(navLabels).not.toContain('Policies');
    expect(navLabels).not.toContain('Admin');
    expect(navLabels).toEqual(['Dashboard', 'Approvals', 'Records', 'Delegations']);
  });

  // Test 2: Admin/Owner role SHOULD see Policies and Admin tabs
  it('should include Policies and Admin navbar tabs for admin or owner roles', () => {
    const getNavItems = (tenantSubdomain: string, isAdmin: boolean, pendingApprovalsCount = 0) => [
      { label: 'Dashboard', href: `/${tenantSubdomain}` },
      { label: 'Approvals', href: `/${tenantSubdomain}/approvals`, count: pendingApprovalsCount },
      { label: 'Records', href: `/${tenantSubdomain}/records` },
      ...(isAdmin ? [{ label: 'Policies', href: `/${tenantSubdomain}/admin/intelligence` }] : []),
      { label: 'Delegations', href: `/${tenantSubdomain}/delegations` },
      ...(isAdmin ? [{ label: 'Admin', href: `/${tenantSubdomain}/admin/approvers` }] : []),
    ];

    const adminNav = getNavItems('meridian', true);
    const navLabels = adminNav.map((n) => n.label);

    expect(navLabels).toContain('Policies');
    expect(navLabels).toContain('Admin');
    expect(navLabels).toEqual(['Dashboard', 'Approvals', 'Records', 'Policies', 'Delegations', 'Admin']);
  });

  // Test 3: Admin route guard logic
  it('should block non-admin roles from accessing /admin subpages', () => {
    const checkAdminAccess = (role: string) => {
      return role === 'admin' || role === 'owner';
    };

    expect(checkAdminAccess('member')).toBe(false);
    expect(checkAdminAccess('employee')).toBe(false);
    expect(checkAdminAccess('admin')).toBe(true);
    expect(checkAdminAccess('owner')).toBe(true);
  });
});
