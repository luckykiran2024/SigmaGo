import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actOnStep } from '@/lib/db/steps';
import { adminClient } from '@/lib/supabase/admin';

// Mock Supabase adminClient
vi.mock('@/lib/supabase/admin', () => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  return {
    adminClient: {
      rpc: rpcMock,
      from: fromMock,
    },
  };
});

// Mock certificate finalizing
vi.mock('@/lib/certificate', () => ({
  generateChecksumAndFinalize: vi.fn().mockResolvedValue({
    requestId: 'req-conc-1',
    tenantId: 'tenant-1',
    checksum: 'mock-canonical-checksum-sha256',
    finalizedAt: new Date().toISOString(),
  }),
}));

// Mock decision event emitter
vi.mock('@/lib/intelligence/events/emit', () => ({
  emitDecisionEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Parallel Approval Concurrency & Idempotency Key Suite (Sprint 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Idempotency key deduplication: Returns alreadyProcessed and prevents duplicate execution', async () => {
    const existingStep = {
      id: 'step-p1',
      status: 'approved',
      acted_at: '2026-09-04T12:00:00.000Z',
    };

    // Mock DB finding step with same idempotency key
    (adminClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: existingStep, error: null }),
        }),
      }),
    });

    const result = await actOnStep({
      stepId: 'step-p1',
      action: 'approved',
      actorId: 'user-app-1',
      tenantId: 'tenant-1',
      actionSource: 'web',
      idempotencyKey: 'idemp-key-abc-123',
    });

    expect(result).toBeDefined();
    expect(result.alreadyProcessed).toBe(true);
    expect(result.stepId).toBe('step-p1');
    expect(result.status).toBe('approved');

    // Verify RPC was NOT called since it was deduplicated
    expect(adminClient.rpc).not.toHaveBeenCalled();
  });

  it('2. Simultaneous parallel stage approvals: Both succeed and stage advances exactly once', async () => {
    const requestId = 'req-conc-1';
    const tenantId = 'tenant-1';

    let stage1ApprovedCount = 0;
    let stage2EnteredCount = 0;

    // Simulate database atomic RPC execution under mutex/row lock
    (adminClient.rpc as any).mockImplementation(async (fnName: string, args: any) => {
      expect(fnName).toBe('sigmago_act_on_step');

      stage1ApprovedCount++;
      const isLastParallelInStage = stage1ApprovedCount === 2;

      if (isLastParallelInStage) {
        stage2EnteredCount++;
        return {
          data: {
            success: true,
            action: 'approved',
            stage_advanced: true,
            next_stage_index: 2,
            finalized: false,
            request_id: requestId,
          },
          error: null,
        };
      }

      return {
        data: {
          success: true,
          action: 'approved',
          stage_advanced: false,
          finalized: false,
          request_id: requestId,
        },
        error: null,
      };
    });

    // Mock query for next stage steps when advanced
    const chainableMock: any = {
      select: vi.fn(() => chainableMock),
      eq: vi.fn(() => chainableMock),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [{ id: 'step-stage2' }], error: null }),
    };
    (adminClient.from as any).mockReturnValue(chainableMock);

    // Run parallel approvals simultaneously using Promise.all
    const [resA, resB] = await Promise.all([
      actOnStep({
        stepId: 'step-p1',
        action: 'approved',
        actorId: 'user-app-1',
        tenantId,
        actionSource: 'web',
        idempotencyKey: 'key-client-A',
      }),
      actOnStep({
        stepId: 'step-p2',
        action: 'approved',
        actorId: 'user-app-2',
        tenantId,
        actionSource: 'web',
        idempotencyKey: 'key-client-B',
      }),
    ]);

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    // Exactly one call should have advanced the stage
    const advancedResults = [resA, resB].filter((r) => r.stage_advanced === true);
    expect(advancedResults).toHaveLength(1);
    expect(stage2EnteredCount).toBe(1);
    expect(stage1ApprovedCount).toBe(2);
  });

  it('3. Final stage parallel approvals: Exactly one finalizes and triggers canonical sealing', async () => {
    const requestId = 'req-final-parallel';
    const tenantId = 'tenant-1';

    let parallelApprovalsInFinalStage = 0;
    const { generateChecksumAndFinalize } = await import('@/lib/certificate');

    (adminClient.rpc as any).mockImplementation(async (fnName: string, args: any) => {
      parallelApprovalsInFinalStage++;
      const isFinalCompleting = parallelApprovalsInFinalStage === 2;

      if (isFinalCompleting) {
        return {
          data: {
            success: true,
            action: 'approved',
            stage_advanced: false,
            finalized: true,
            request_id: requestId,
          },
          error: null,
        };
      }

      return {
        data: {
          success: true,
          action: 'approved',
          stage_advanced: false,
          finalized: false,
          request_id: requestId,
        },
        error: null,
      };
    });

    (adminClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: { workflow_id: null }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const [res1, res2] = await Promise.all([
      actOnStep({
        stepId: 'step-final-p1',
        action: 'approved',
        actorId: 'user-app-1',
        tenantId,
        actionSource: 'web',
        idempotencyKey: 'key-final-1',
      }),
      actOnStep({
        stepId: 'step-final-p2',
        action: 'approved',
        actorId: 'user-app-2',
        tenantId,
        actionSource: 'web',
        idempotencyKey: 'key-final-2',
      }),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    const finalizedResults = [res1, res2].filter((r) => r.finalized === true);
    expect(finalizedResults).toHaveLength(1);

    // Sealed exactly once
    expect(generateChecksumAndFinalize).toHaveBeenCalledTimes(1);
    expect(generateChecksumAndFinalize).toHaveBeenCalledWith(requestId, tenantId);
  });
});
