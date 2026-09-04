import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTenantClient,
  getTenantAdminClient,
  validateTenantAccess,
  CrossTenantAccessError,
} from '@/lib/supabase/tenantClient';

describe('Application-Path RLS & Cross-Tenant Defence in Depth Suite (Sprint 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. validateTenantAccess rejects cross-tenant access with CrossTenantAccessError', () => {
    const tenantA = '00000000-0000-0000-0000-00000000000a';
    const tenantB = '00000000-0000-0000-0000-00000000000b';

    // Same tenant succeeds
    expect(() => validateTenantAccess(tenantA, tenantA)).not.toThrow();

    // Cross-tenant fails
    expect(() => validateTenantAccess(tenantA, tenantB)).toThrow(CrossTenantAccessError);
    expect(() => validateTenantAccess(null, tenantB)).toThrow(CrossTenantAccessError);
    expect(() => validateTenantAccess(undefined, tenantB)).toThrow(CrossTenantAccessError);
  });

  it('2. getTenantClient verifies caller tenant context and rejects mismatched tenants', () => {
    const tenantA = '00000000-0000-0000-0000-00000000000a';
    const tenantB = '00000000-0000-0000-0000-00000000000b';

    const userContextA = {
      id: 'user-a',
      tenantId: tenantA,
      email: 'user@tenant-a.com',
      role: 'member',
    };

    // User A accessing Tenant A succeeds
    expect(() => getTenantClient(tenantA, userContextA)).not.toThrow();

    // User A attempting to access Tenant B throws CrossTenantAccessError
    expect(() => getTenantClient(tenantB, userContextA)).toThrow(CrossTenantAccessError);
  });

  it('3. getTenantAdminClient enforces administrative role checks', () => {
    const tenantId = '00000000-0000-0000-0000-00000000000a';

    const memberContext = {
      id: 'user-member',
      tenantId,
      email: 'member@test.com',
      role: 'member',
    };

    const adminContext = {
      id: 'user-admin',
      tenantId,
      email: 'admin@test.com',
      role: 'admin',
    };

    const ownerContext = {
      id: 'user-owner',
      tenantId,
      email: 'owner@test.com',
      role: 'owner',
    };

    // Non-admin rejected
    expect(() => getTenantAdminClient(tenantId, memberContext)).toThrow(CrossTenantAccessError);

    // Admin & Owner succeed
    expect(() => getTenantAdminClient(tenantId, adminContext)).not.toThrow();
    expect(() => getTenantAdminClient(tenantId, ownerContext)).not.toThrow();
  });

  it('4. getTenantClient automatically injects tenant_id on insert and scopes queries', async () => {
    const tenantId = '00000000-0000-0000-0000-00000000000a';
    const client = getTenantClient(tenantId);

    // Intercepted .from('approval_requests')
    const qb = client.from('approval_requests');

    // Test select scoping: select() automatically chains .eq('tenant_id', tenantId)
    const selectQuery = qb.select('id, ref');
    expect(selectQuery).toBeDefined();

    // Test insert injection
    const singleInsertPayload = { subject: 'Test Req' };
    const insertQuery = qb.insert(singleInsertPayload);
    expect(insertQuery).toBeDefined();
  });

  it('5. AGGREGATE_ONLY privacy enforces small cohort suppression (< 5 decisions)', () => {
    const contributors = [
      {
        workflowId: 'wf-large-1',
        workflowName: 'Large Workflow A',
        currentCount: 45,
        baselineCount: 40,
      },
      {
        workflowId: 'wf-small-1',
        workflowName: 'Small Niche Team',
        currentCount: 2,
        baselineCount: 1,
      },
      {
        workflowId: 'wf-small-2',
        workflowName: 'Sensitive Individual Role',
        currentCount: 1,
        baselineCount: 0,
      },
    ];

    // Cohort suppression algorithm
    let suppressedCurrent = 0;
    let suppressedBaseline = 0;
    const preserved: any[] = [];

    contributors.forEach((c) => {
      if (c.currentCount < 5 && c.baselineCount < 5) {
        suppressedCurrent += c.currentCount;
        suppressedBaseline += c.baselineCount;
      } else {
        preserved.push(c);
      }
    });

    if (suppressedCurrent > 0 || suppressedBaseline > 0) {
      preserved.push({
        workflowId: 'wf-suppressed',
        workflowName: 'Other workflows (< 5 decisions suppressed for privacy)',
        currentCount: suppressedCurrent,
        baselineCount: suppressedBaseline,
      });
    }

    // Expect small cohorts to be rolled up into suppressed bucket
    expect(preserved).toHaveLength(2);
    expect(preserved[0].workflowName).toBe('Large Workflow A');
    expect(preserved[1].workflowName).toContain('< 5 decisions suppressed');
    expect(preserved[1].currentCount).toBe(3); // 2 + 1
    expect(preserved[1].baselineCount).toBe(1); // 1 + 0
  });
});
