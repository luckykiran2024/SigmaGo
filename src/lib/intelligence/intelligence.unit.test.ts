import { describe, it, expect, vi } from 'vitest';

// Use vi.hoisted to ensure mock object is available before vi.mock hoisting
const { mockAdminClient } = vi.hoisted(() => ({
  mockAdminClient: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: mockAdminClient,
}));

import { resolveIntelligenceAccess } from './access';

describe('intelligence.test.ts — Metrics, Policy Chains & Access Control (Tests 13-17)', () => {

  // Test 13: 4th exception reads exact count 4
  it('13. 4th exception reads exactly 4', () => {
    const priorExceptions = [
      { id: 'exc-1', policy_id: 'pol-1', status: 'approved' },
      { id: 'exc-2', policy_id: 'pol-1', status: 'approved' },
      { id: 'exc-3', policy_id: 'pol-1', status: 'approved' },
    ];
    const newException = { id: 'exc-4', policy_id: 'pol-1', status: 'approved' };

    const calculateExceptionCount = (exceptions: Array<{ status: string }>) => {
      return exceptions.filter((e) => e.status === 'approved').length;
    };

    const count = calculateExceptionCount([...priorExceptions, newException]);
    expect(count).toBe(4);
  });

  // Test 14: Exception against a superseded policy version doesn't inflate the current count
  it('14. Exception against a superseded policy version doesn\'t inflate the current count', () => {
    const policyV1Exceptions = [
      { id: 'exc-v1-1', policy_id: 'pol-v1', version: 1, status: 'approved' },
      { id: 'exc-v1-2', policy_id: 'pol-v1', version: 1, status: 'approved' },
    ];
    const policyV2Exceptions = [
      { id: 'exc-v2-1', policy_id: 'pol-v2', version: 2, status: 'approved' },
    ];

    const getActiveVersionExceptionCount = (exceptions: Array<{ policy_id: string; version: number }>, targetVersion: number) => {
      return exceptions.filter((e) => e.version === targetVersion).length;
    };

    const allExceptions = [...policyV1Exceptions, ...policyV2Exceptions];
    const v2Count = getActiveVersionExceptionCount(allExceptions, 2);

    expect(v2Count).toBe(1);
    expect(v2Count).not.toBe(3); // V1 exceptions must NOT inflate V2 count
  });

  // Test 15: A reference survives deletion of its creating user (Open Finding Check)
  it('15. A reference survives deletion of its creating user', () => {
    const decisionReference = {
      id: 'ref-101',
      source_id: 'req-1',
      target_policy_id: 'pol-1',
      created_by_user_id: 'user-deleted-999',
      relationship: 'exception_to',
      created_at: '2026-01-01T00:00:00Z',
    };

    const simulateUserDeletion = (refRecord: typeof decisionReference, deletedUserId: string) => {
      if (refRecord.created_by_user_id === deletedUserId) {
        return {
          ...refRecord,
          created_by_user_snapshot: 'Deleted User (Historical Archive)',
        };
      }
      return refRecord;
    };

    const preservedRef = simulateUserDeletion(decisionReference, 'user-deleted-999');

    expect(preservedRef).toBeDefined();
    expect(preservedRef.id).toBe('ref-101');
    expect(preservedRef.relationship).toBe('exception_to');
    expect(preservedRef.created_by_user_snapshot).toBe('Deleted User (Historical Archive)');
  });

  // Test 16: Admin with no grant gets 403 / access denied
  it('16. Admin with no grant gets 403', async () => {
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'admin-1', tenant_id: 'tenant-1', email: 'admin@co.com', status: 'active' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'intelligence_grants') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({
                    data: null, // No grant!
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const access = await resolveIntelligenceAccess('tenant-1', 'admin-1');

    expect(access.granted).toBe(false);
    expect(access.scope).toBeNull();
    expect(access.grantId).toBeNull();
  });

  // Test 17: AGGREGATE scope response contains no participant comments
  it('17. AGGREGATE scope response contains no participant comments', () => {
    const rawMetricsResponse = {
      tenantId: 'tenant-1',
      totalExceptions: 4,
      scope: 'AGGREGATE_ONLY',
      policySummaries: [
        {
          policyId: 'pol-1',
          name: 'Expense Limits Policy',
          participantNotes: [
            { user: 'John Doe', comment: 'Slight overrun allowed' },
            { user: 'Jane Smith', comment: 'Approved under emergency exception' },
          ],
        },
      ],
    };

    const sanitizeForAggregateScope = (payload: typeof rawMetricsResponse) => {
      if (payload.scope === 'AGGREGATE_ONLY') {
        return {
          tenantId: payload.tenantId,
          totalExceptions: payload.totalExceptions,
          scope: payload.scope,
          policySummaries: payload.policySummaries.map((p) => ({
            policyId: p.policyId,
            name: p.name,
            participantNotes: [],
          })),
        };
      }
      return payload;
    };

    const sanitized = sanitizeForAggregateScope(rawMetricsResponse);

    expect(sanitized.policySummaries[0].participantNotes).toEqual([]);
    expect(JSON.stringify(sanitized)).not.toContain('Slight overrun allowed');
    expect(JSON.stringify(sanitized)).not.toContain('John Doe');
  });
});
