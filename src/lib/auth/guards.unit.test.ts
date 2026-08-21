import { describe, it, expect } from 'vitest';

function checkTenantIsolation(profileTenantId: string, targetTenantId: string): boolean {
  if (profileTenantId !== targetTenantId) {
    throw new Error('Forbidden: User does not belong to this tenant');
  }
  return true;
}

describe('Tenant Isolation Guard Mismatch Check [Pure Unit Test]', () => {
  it('should allow access when user profile tenant_id matches target tenant_id', () => {
    const profileTenantId = 'tenant-uuid-111';
    const targetTenantId = 'tenant-uuid-111';
    expect(checkTenantIsolation(profileTenantId, targetTenantId)).toBe(true);
  });

  it('should throw Forbidden Error when user profile tenant_id mismatches target tenant_id', () => {
    const profileTenantId = 'tenant-uuid-111';
    const targetTenantId = 'tenant-uuid-222';
    expect(() => checkTenantIsolation(profileTenantId, targetTenantId)).toThrow(
      'Forbidden: User does not belong to this tenant'
    );
  });
});
