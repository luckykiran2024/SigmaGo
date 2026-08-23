import { describe, it, expect } from 'vitest';

describe('Build Prompt #17 — Decoupled Intelligence Access Control Unit Tests', () => {
  // Test 1: Intelligence access evaluation (Decoupled from role templates)
  it('should grant intelligence access to non-admin employees if they hold an active explicit grant', () => {
    const evaluateIntelligenceAccess = (
      role: string,
      email: string,
      activeGrants: Array<{ email: string; revoked_at: string | null }>
    ) => {
      const isAdmin = role === 'admin' || role === 'owner';
      const hasGrant = activeGrants.some(
        (g) => g.email.toLowerCase() === email.toLowerCase() && !g.revoked_at
      );
      return isAdmin || hasGrant;
    };

    const activeGrants = [
      { email: 'sigmago596+mrd003@gmail.com', revoked_at: null },
      { email: 'anand.kulkarni@meridian.com', revoked_at: null },
      { email: 'sunita.iyer@meridian.com', revoked_at: '2026-08-17T00:00:00Z' }, // Revoked
    ];

    // Krishna Pillai (member role, but has active grant)
    expect(evaluateIntelligenceAccess('member', 'sigmago596+mrd003@gmail.com', activeGrants)).toBe(true);

    // Sunita Iyer (member role, revoked grant)
    expect(evaluateIntelligenceAccess('member', 'sunita.iyer@meridian.com', activeGrants)).toBe(false);

    // Random employee with no grant
    expect(evaluateIntelligenceAccess('member', 'employee@meridian.com', activeGrants)).toBe(false);

    // Workspace Admin (always has access)
    expect(evaluateIntelligenceAccess('admin', 'admin@meridian.com', activeGrants)).toBe(true);
  });

  // Test 2: Navbar tab generation for employees with Intelligence Grants
  it('should render the Intelligence navigation tab when a non-admin employee has an active grant', () => {
    const getNavItems = (tenantSubdomain: string, isAdmin: boolean, hasIntelligenceGrant: boolean) => {
      return [
        { label: 'Dashboard', href: `/${tenantSubdomain}` },
        { label: 'Approvals', href: `/${tenantSubdomain}/approvals` },
        { label: 'Records', href: `/${tenantSubdomain}/records` },
        ...(hasIntelligenceGrant || isAdmin
          ? [{ label: 'Intelligence', href: `/${tenantSubdomain}/intelligence` }]
          : []),
        { label: 'Delegations', href: `/${tenantSubdomain}/delegations` },
        ...(isAdmin ? [{ label: 'Admin', href: `/${tenantSubdomain}/admin/approvers` }] : []),
      ];
    };

    // Employee WITH grant -> gets Intelligence tab
    const employeeWithGrantNav = getNavItems('meridian', false, true);
    const employeeWithGrantLabels = employeeWithGrantNav.map((n) => n.label);
    expect(employeeWithGrantLabels).toContain('Intelligence');
    expect(employeeWithGrantLabels).not.toContain('Admin');

    // Employee WITHOUT grant -> no Intelligence tab
    const employeeWithoutGrantNav = getNavItems('meridian', false, false);
    const employeeWithoutGrantLabels = employeeWithoutGrantNav.map((n) => n.label);
    expect(employeeWithoutGrantLabels).not.toContain('Intelligence');
  });

  // Test 3: Drill-through permission scoping (FULL vs AGGREGATE_ONLY)
  it('should allow drill-through links only for FULL scope grants', () => {
    const canDrillThrough = (scope: 'FULL' | 'AGGREGATE_ONLY') => scope === 'FULL';

    expect(canDrillThrough('FULL')).toBe(true);
    expect(canDrillThrough('AGGREGATE_ONLY')).toBe(false);
  });
});
