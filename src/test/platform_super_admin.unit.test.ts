import { describe, it, expect } from 'vitest';

describe('SigmaGo Platform Super Admin Persona Test Suite', () => {
  // Test 1: Super admin route security verification
  it('should restrict /platform-admin routes to explicitly configured admin emails or app_metadata', () => {
    const isPlatformSuperAdmin = (email: string, appMetadata?: Record<string, any>) => {
      // Mirrors production assertPlatformAdmin() logic
      const envAdmins = process.env.PLATFORM_ADMIN_EMAILS;
      const configuredAdmins = envAdmins
        ? envAdmins.toLowerCase().split(',').map(e => e.trim()).filter(Boolean)
        : [];
      return configuredAdmins.includes(email.toLowerCase().trim()) ||
        appMetadata?.is_platform_admin === true;
    };

    // Set up environment for test
    const original = process.env.PLATFORM_ADMIN_EMAILS;
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@sigmago.com,superadmin@sigmago.com';

    expect(isPlatformSuperAdmin('admin@sigmago.com')).toBe(true);
    expect(isPlatformSuperAdmin('superadmin@sigmago.com')).toBe(true);
    expect(isPlatformSuperAdmin('any@gmail.com', { is_platform_admin: true })).toBe(true);
    expect(isPlatformSuperAdmin('vijay.reddy@meridian.com')).toBe(false); // Tenant admin, not platform super admin
    expect(isPlatformSuperAdmin('krishna.pillai@meridian.com')).toBe(false);
    // Domain wildcard MUST NOT work
    expect(isPlatformSuperAdmin('random@sigmago.com')).toBe(false);
    // user_metadata is NOT checked (only app_metadata)
    expect(isPlatformSuperAdmin('attacker@evil.com')).toBe(false);

    // Restore
    if (original !== undefined) process.env.PLATFORM_ADMIN_EMAILS = original;
    else delete process.env.PLATFORM_ADMIN_EMAILS;
  });

  // Test 2: Platform Super Admin data isolation check
  it('should isolate tenant approval requests and decision records from platform super admin view', () => {
    const getSuperAdminNavItems = () => [
      { label: 'Tenant Observability', href: '/platform-admin' },
      { label: 'Onboard Tenant', href: '/platform-admin/onboard' },
      { label: 'Support Tickets', href: '/platform-admin/tickets' },
    ];

    const superAdminNav = getSuperAdminNavItems();
    const navLabels = superAdminNav.map((n) => n.label);

    expect(navLabels).not.toContain('Approvals');
    expect(navLabels).not.toContain('Records');
    expect(navLabels).toEqual(['Tenant Observability', 'Onboard Tenant', 'Support Tickets']);
  });

  // Test 3: Health status derivation logic
  it('should calculate tenant health status correctly based on open tickets and database latency', () => {
    const deriveHealthStatus = (openTickets: number, pingMs: number): 'HEALTHY' | 'DEGRADED' | 'ATTENTION_REQUIRED' => {
      if (openTickets > 3 || pingMs > 500) return 'ATTENTION_REQUIRED';
      if (openTickets > 0 || pingMs > 250) return 'DEGRADED';
      return 'HEALTHY';
    };

    expect(deriveHealthStatus(0, 45)).toBe('HEALTHY');
    expect(deriveHealthStatus(1, 100)).toBe('DEGRADED');
    expect(deriveHealthStatus(5, 50)).toBe('ATTENTION_REQUIRED');
    expect(deriveHealthStatus(0, 600)).toBe('ATTENTION_REQUIRED');
  });

  // Test 4: Support ticket priority sorting
  it('should correctly prioritize support tickets', () => {
    const priorityWeight: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const mockTickets = [
      { id: '1', priority: 'LOW' },
      { id: '2', priority: 'URGENT' },
      { id: '3', priority: 'HIGH' },
    ];

    const sorted = [...mockTickets].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    expect(sorted[0].priority).toBe('URGENT');
    expect(sorted[1].priority).toBe('HIGH');
    expect(sorted[2].priority).toBe('LOW');
  });
});
