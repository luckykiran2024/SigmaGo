import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

import { loadCanonicalDecisionInputs, generateChecksumAndFinalize } from '../lib/certificate';

describe('Workstream 2: Canonical Decision Evidence Fail-Closed Invariants', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('1. Throws immediately if approval_steps query fails, never producing empty steps', async () => {
    // 1. Mock request query success
    const mockRequestQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          tenant_id: 'tenant-1',
          ref: 'REQ-001',
          subject: 'Critical Infrastructure Approval',
          status: 'FINALIZING',
          created_at: '2026-09-01T00:00:00.000Z',
        },
        error: null,
      }),
    };

    // 2. Mock approval_steps query failure (e.g. network/db error)
    const mockStepsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('PostgreSQL connection timeout on approval_steps'),
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'approval_requests') return mockRequestQuery;
      if (table === 'approval_steps') return mockStepsQuery;
      return {} as any;
    });

    await expect(loadCanonicalDecisionInputs('req-1', 'tenant-1')).rejects.toThrow(
      'Failed to load authoritative approval steps for request req-1: PostgreSQL connection timeout on approval_steps'
    );
  });

  it('2. Queries approval_steps by request_id without invalid tenant_id filter', async () => {
    const eqCalls: Record<string, string> = {};

    const mockRequestQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'req-2', tenant_id: 'tenant-2', ref: 'REQ-002', subject: 'Test' },
        error: null,
      }),
    };

    const mockStepsQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((col: string, val: string) => {
        eqCalls[col] = val;
        return mockStepsQuery;
      }),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'step-1',
            stage_index: 0,
            order_index: 0,
            approver_id: 'user-1',
            status: 'approved',
            acted_at: '2026-09-01T12:00:00.000Z',
            stance: 'APPROVE',
            outcome: 'SATISFIED',
            was_binding: true,
            comment: 'Fully aligned with architecture guidelines',
          },
        ],
        error: null,
      }),
    };

    const mockGenericList = () => {
      const q: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
      };
      return q;
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'approval_requests') return mockRequestQuery;
      if (table === 'approval_steps') return mockStepsQuery;
      return mockGenericList();
    });

    const inputs = await loadCanonicalDecisionInputs('req-2', 'tenant-2');
    expect(inputs).toBeDefined();
    expect(inputs.steps).toHaveLength(1);
    expect(eqCalls['request_id']).toBe('req-2');
    expect(eqCalls['tenant_id']).toBeUndefined(); // Tenancy enforced via request, not steps
  });

  it('3. Refuses unsealed fallback update if sigmago_finalize_seal RPC fails', async () => {
    // Mock successful input loading
    mockFrom.mockImplementation((table: string) => {
      if (table === 'approval_requests') {
        const query: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'req-3', tenant_id: 'tenant-3', ref: 'REQ-003', status: 'FINALIZING' },
            error: null,
          }),
        };
        return query;
      }
      if (table === 'approval_steps') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
      };
    });

    // Mock RPC failure
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error('RPC deadlock: could not acquire lock on row in approval_requests'),
    });

    // Assert that generateChecksumAndFinalize throws rather than performing direct update
    await expect(generateChecksumAndFinalize('req-3', 'tenant-3')).rejects.toThrow(
      'Authoritative sigmago_finalize_seal RPC failed for request req-3'
    );
  });
});
