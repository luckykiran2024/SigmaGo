import { describe, it, expect } from 'vitest';
import { validateTenantSettingsPatch } from './settings';

describe('Tenant Settings Update Allowlist Unit Tests (src/lib/tenancy/settings.unit.test.ts)', () => {
  it('1. Accepts valid allowlisted settings updates', () => {
    const validPatch = {
      name: 'Acme Corp Updated',
      support_email: 'support@acme.com',
      primary_color: '#10b981',
    };

    const sanitized = validateTenantSettingsPatch(validPatch);
    expect(sanitized).toEqual(validPatch);
  });

  it('2. Rejects attempt to update plan field with 400 error', () => {
    const invalidPatch = {
      name: 'Acme Corp',
      plan: 'enterprise',
    };

    expect(() => validateTenantSettingsPatch(invalidPatch)).toThrow(
      "Unauthorized settings field update: Field 'plan' is read-only and cannot be updated by tenant admins."
    );
  });

  it('3. Rejects attempt to update dkim_verified or powered_by fields', () => {
    expect(() => validateTenantSettingsPatch({ dkim_verified: true })).toThrow(/read-only/);
    expect(() => validateTenantSettingsPatch({ powered_by: 'custom' })).toThrow(/read-only/);
  });
});
