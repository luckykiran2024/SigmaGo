import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => {
  const fromMock = vi.fn();
  const rpcMock = vi.fn();
  return {
    adminClient: {
      from: fromMock,
      rpc: rpcMock,
    },
    getAdminClient: vi.fn(),
  };
});

import {
  emitPlatformAlert,
  alertApprovalRpcFailure,
  alertSealGenerationFailure,
  alertSealVerificationMismatch,
  alertCrossTenantViolation,
  monitorOutboxBacklog,
  alertAggregateWorkerFailure,
  checkStaleFinalizingRequests,
} from '../lib/observability/alerts';
import { adminClient } from '@/lib/supabase/admin';

describe('Sprint 7: Production Observability & Alerting Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Approval RPC Failure Alert
  it('1. Emits structured error alert on Approval RPC failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = alertApprovalRpcFailure('req-123', 'tenant-alpha', 'PGRST116: Deadlock detected');

    expect(alert).toBeDefined();
    expect(alert.level).toBe('error');
    expect(alert.tags.alert_category).toBe('APPROVAL_RPC_FAILURE');
    expect(alert.tags.tenant_id).toBe('tenant-alpha');
    expect(alert.tags.request_id).toBe('req-123');
    expect(consoleSpy).toHaveBeenCalled();
  });

  // 2. Seal Generation Failure Alert
  it('2. Emits fatal alert on cryptographic seal generation failure', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = alertSealGenerationFailure('req-456', 'tenant-beta', 'KMS key unavailable');

    expect(alert).toBeDefined();
    expect(alert.level).toBe('fatal');
    expect(alert.tags.alert_category).toBe('SEAL_FAILURE');
    expect(consoleSpy).toHaveBeenCalled();
  });

  // 3. Seal Verification Mismatch Alert
  it('3. Emits fatal alert when cryptographic seal does not match recalculated hash', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = alertSealVerificationMismatch('req-789', 'tenant-gamma', 'hash_abc123', 'hash_xyz789');

    expect(alert).toBeDefined();
    expect(alert.level).toBe('fatal');
    expect(alert.tags.alert_category).toBe('SEAL_VERIFICATION_FAILURE');
    expect(alert.extra.calculatedHash).toBe('hash_abc123');
    expect(alert.extra.recordedHash).toBe('hash_xyz789');
    expect(consoleSpy).toHaveBeenCalled();
  });

  // 4. Cross-Tenant Violation Alert
  it('4. Emits error alert on attempted cross-tenant access', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = alertCrossTenantViolation('user-attacker', 'tenant-victim', 'tenant-attacker');

    expect(alert).toBeDefined();
    expect(alert.level).toBe('error');
    expect(alert.tags.alert_category).toBe('CROSS_TENANT_VIOLATION');
    expect(alert.extra.actorId).toBe('user-attacker');
    expect(alert.extra.attemptedTenantId).toBe('tenant-victim');
    expect(alert.extra.actualTenantId).toBe('tenant-attacker');
    expect(consoleSpy).toHaveBeenCalled();
  });

  // 5. Aggregate Worker Failure Alert
  it('5. Emits error alert when background aggregate worker fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = alertAggregateWorkerFailure('OutboxBatchProcessor', 'Network timeout', 'tenant-delta');

    expect(alert).toBeDefined();
    expect(alert.level).toBe('error');
    expect(alert.tags.alert_category).toBe('AGGREGATE_WORKER_FAILURE');
    expect(alert.extra.workerName).toBe('OutboxBatchProcessor');
    expect(consoleSpy).toHaveBeenCalled();
  });

  // 6. Outbox Backlog Monitor
  it('6. Monitors outbox backlog and alerts when count threshold is exceeded', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock adminClient outbox calls
    (adminClient.from as any).mockImplementation((table: string) => {
      if (table === 'transactional_outbox') {
        return {
          select: vi.fn().mockImplementation((cols: string, opts?: any) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockResolvedValue({ count: 150, error: null }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }),
        } as any;
      }
      return {} as any;
    });

    const status = await monitorOutboxBacklog(100, 10);
    expect(status.pendingCount).toBe(150);
    expect(status.oldestAgeMinutes).toBeGreaterThanOrEqual(14);
    expect(warnSpy).toHaveBeenCalled();
  });

  // 7. Stale 'FINALIZING' Requests Monitor
  it('7. Detects and alerts on requests stuck in FINALIZING status for > 5 minutes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const staleRecord = {
      id: 'req-stuck-1',
      tenant_id: 'tenant-omega',
      status: 'FINALIZING',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };

    (adminClient.from as any).mockImplementation((table: string) => {
      if (table === 'approval_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({
                data: [staleRecord],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const staleList = await checkStaleFinalizingRequests(5);
    expect(staleList).toHaveLength(1);
    expect(staleList[0].id).toBe('req-stuck-1');
    expect(errorSpy).toHaveBeenCalled();
  });
});
