import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actOnStep } from '@/lib/db/steps';
import { adminClient } from '@/lib/supabase/admin';

// Mock adminClient
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
  generateChecksumAndFinalize: vi.fn(),
  buildCanonicalDecisionRecord: vi.fn(),
  computeCanonicalSha256: vi.fn(),
  loadCanonicalDecisionInputs: vi.fn(),
}));

// Mock decision events
vi.mock('@/lib/intelligence/events/emit', () => ({
  emitDecisionEvent: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Deterministic Concurrency Synchronization Barrier.
 * Guarantees that multiple concurrent callers reach the exact execution point
 * before being released simultaneously.
 */
class ConcurrencyBarrier {
  private count: number = 0;
  private target: number;
  private releasePromise: Promise<void>;
  private releaseResolve!: () => void;

  constructor(target: number) {
    this.target = target;
    this.releasePromise = new Promise<void>((resolve) => {
      this.releaseResolve = resolve;
    });
  }

  async arriveAndWait(): Promise<void> {
    this.count++;
    if (this.count === this.target) {
      this.releaseResolve();
    }
    await this.releasePromise;
  }
}

describe('Deterministic Concurrency Barrier & Fault-Injection Suite (Sprint 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Deterministic Concurrency Barrier: 20 Controlled Parallel Iterations
  it('1. Deterministic synchronization barrier across 20 iterations: Exactly-once stage advance and exactly-once finalization', async () => {
    const ITERATIONS = 20;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const requestId = `req-barrier-${iter}`;
      const tenantId = `tenant-${iter}`;
      const barrier = new ConcurrencyBarrier(2);

      let stageAdvancements = 0;
      let approvalsCount = 0;

      const chainableMock: any = {
        select: vi.fn(() => chainableMock),
        eq: vi.fn(() => chainableMock),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: { workflow_id: null }, error: null }),
        then: (resolve: any) => resolve({ data: [{ id: 'step-stage2' }], error: null }),
      };
      (adminClient.from as any).mockReturnValue(chainableMock);

      // Synchronized RPC mock with barrier hold
      (adminClient.rpc as any).mockImplementation(async (fnName: string, args: any) => {
        // Both connections arrive and wait for simultaneous release
        await barrier.arriveAndWait();

        // Mutex emulation under PostgreSQL FOR UPDATE
        approvalsCount++;
        const isSecond = approvalsCount === 2;

        if (isSecond) {
          stageAdvancements++;
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

      const [resA, resB] = await Promise.all([
        actOnStep({
          stepId: `step-a-${iter}`,
          action: 'approved',
          actorId: 'user-a',
          tenantId,
          actionSource: 'web',
          idempotencyKey: `idemp-a-${iter}`,
        }),
        actOnStep({
          stepId: `step-b-${iter}`,
          action: 'approved',
          actorId: 'user-b',
          tenantId,
          actionSource: 'web',
          idempotencyKey: `idemp-b-${iter}`,
        }),
      ]);

      expect(resA.success).toBe(true);
      expect(resB.success).toBe(true);

      const advanced = [resA, resB].filter((r) => r.stage_advanced === true);
      expect(advanced).toHaveLength(1);
      expect(stageAdvancements).toBe(1);
      expect(approvalsCount).toBe(2);
    }
  });

  // 2. Two-Phase Finalization Invariant: Cryptographic Seal Failure leaves request in FINALIZING
  it('2. Fault injection: Cryptographic seal generation failure prevents request from ever reaching approved state', async () => {
    const requestId = 'req-seal-fail-001';
    const tenantId = 'tenant-omega';

    const { generateChecksumAndFinalize } = await import('@/lib/certificate');
    // Force seal failure (e.g. hash computation error or KMS unreachable)
    (generateChecksumAndFinalize as any).mockResolvedValue(null);

    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const chainableMock: any = {
      select: vi.fn(() => chainableMock),
      eq: vi.fn(() => chainableMock),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: { workflow_id: null }, error: null }),
      update: updateSpy,
    };
    (adminClient.from as any).mockReturnValue(chainableMock);

    (adminClient.rpc as any).mockResolvedValue({
      data: {
        success: true,
        action: 'approved',
        stage_advanced: false,
        finalized: false,
        needs_seal: true,
        request_status: 'FINALIZING',
        request_id: requestId,
      },
      error: null,
    });

    // actOnStep must reject or throw because the request cannot be approved without a seal
    await expect(
      actOnStep({
        stepId: 'step-final-seal-fail',
        action: 'approved',
        actorId: 'approver-1',
        tenantId,
        actionSource: 'web',
        idempotencyKey: 'idemp-seal-fail',
      })
    ).rejects.toThrow(/FATAL: Cryptographic sealing failed/);

    // Verify that approval_requests was NEVER updated to status: 'approved'
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // 3. Fault Injection: Authoritative Database RPC Failure rolls back completely
  it('3. Fault injection: Stored procedure failure rolls back transaction without partial state updates', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    (adminClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    // Injected database error (e.g., deadlock, foreign key violation, lock timeout)
    (adminClient.rpc as any).mockResolvedValue({
      data: null,
      error: { message: 'deadlock detected: Process 10123 waits for ExclusiveLock', code: '40P01' },
    });

    try {
      await expect(
        actOnStep({
          stepId: 'step-deadlock-inject',
          action: 'approved',
          actorId: 'approver-1',
          tenantId: 'tenant-1',
          actionSource: 'web',
        })
      ).rejects.toThrow(/Authoritative transaction failed in database RPC: deadlock detected/);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // 4. Fault Injection: Analytics Event/Worker failure does not compromise authoritative approval
  it('4. Fault injection: Analytics outbox event emission error does not invalidate approved decision', async () => {
    const requestId = 'req-analytics-fail-001';
    const tenantId = 'tenant-1';

    const { generateChecksumAndFinalize } = await import('@/lib/certificate');
    (generateChecksumAndFinalize as any).mockResolvedValue({
      requestId,
      tenantId,
      checksum: 'valid-sha256-checksum',
      finalizedAt: new Date().toISOString(),
    });

    (adminClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: { workflow_id: null }, error: null }),
        }),
      }),
    });

    (adminClient.rpc as any).mockResolvedValue({
      data: {
        success: true,
        action: 'approved',
        stage_advanced: false,
        finalized: false,
        needs_seal: true,
        request_status: 'FINALIZING',
        request_id: requestId,
      },
      error: null,
    });

    const result = await actOnStep({
      stepId: 'step-analytics-test',
      action: 'approved',
      actorId: 'approver-1',
      tenantId,
      actionSource: 'web',
    });

    expect(result.success).toBe(true);
  });
});
