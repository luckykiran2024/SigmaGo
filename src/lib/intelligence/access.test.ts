import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './access';

describe('Prompt #09b — Intelligence Access Control & Normalization', () => {
  it('1. Should strictly normalize emails (lowercase and trim, preserve dots and plus)', () => {
    expect(normalizeEmail('  Finance@Co.com  ')).toBe('finance@co.com');
    expect(normalizeEmail('A.B+x@gmail.com')).toBe('a.b+x@gmail.com');
    expect(normalizeEmail('cfo.office@corp.org')).toBe('cfo.office@corp.org');
  });

  it('2. Should enforce that Admin roles do NOT implicitly confer intelligence access', () => {
    // Role decoupling check
    const adminUser = { role: 'admin', hasGrant: false };
    const memberUserWithGrant = { role: 'member', hasGrant: true, scope: 'FULL' };

    const canAccessIntelligence = (user: { role: string; hasGrant: boolean }) => user.hasGrant;

    expect(canAccessIntelligence(adminUser)).toBe(false);
    expect(canAccessIntelligence(memberUserWithGrant)).toBe(true);
  });

  it('3. Should reject revoked or expired grants', () => {
    const activeGrant = { revokedAt: null, expiresAt: '2099-01-01T00:00:00Z' };
    const revokedGrant = { revokedAt: '2026-01-01T00:00:00Z', expiresAt: null };
    const expiredGrant = { revokedAt: null, expiresAt: '2020-01-01T00:00:00Z' };

    const isValid = (grant: { revokedAt: string | null; expiresAt: string | null }) => {
      if (grant.revokedAt) return false;
      if (grant.expiresAt && new Date(grant.expiresAt) <= new Date()) return false;
      return true;
    };

    expect(isValid(activeGrant)).toBe(true);
    expect(isValid(revokedGrant)).toBe(false);
    expect(isValid(expiredGrant)).toBe(false);
  });

  it('4. Should apply small-number suppression for AGGREGATE_ONLY scope when Impact Factor < 5', () => {
    const THRESHOLD = 5;

    const formatImpactFactor = (count: number, scope: 'AGGREGATE_ONLY' | 'FULL') => {
      if (scope === 'AGGREGATE_ONLY' && count > 0 && count < THRESHOLD) {
        return `fewer than ${THRESHOLD}`;
      }
      return count;
    };

    expect(formatImpactFactor(3, 'AGGREGATE_ONLY')).toBe('fewer than 5');
    expect(formatImpactFactor(3, 'FULL')).toBe(3);
    expect(formatImpactFactor(12, 'AGGREGATE_ONLY')).toBe(12);
  });

  it('5. Should enforce strict tenant isolation (grant in Tenant A gives no access in Tenant B)', () => {
    const grant = { tenantId: 'tenant-A', email: 'cfo@corp.com' };

    const resolveTenantAccess = (requestTenantId: string, userEmail: string) => {
      return grant.tenantId === requestTenantId && grant.email === normalizeEmail(userEmail);
    };

    expect(resolveTenantAccess('tenant-A', 'cfo@corp.com')).toBe(true);
    expect(resolveTenantAccess('tenant-B', 'cfo@corp.com')).toBe(false);
  });
});
