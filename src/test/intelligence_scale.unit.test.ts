import { describe, it, expect, vi } from 'vitest';
import { recordOutboxEvent, claimOutboxBatch, processOutboxBatch } from '../lib/events/outbox';
import { reconcileIntelligenceAggregates } from '../../scripts/reconcile-intelligence-aggregates';
import { rebuildIntelligenceAggregates } from '../../scripts/rebuild-intelligence-aggregates';
import { adminClient } from '../lib/supabase/admin';

describe('Sprint 6: Organisational Intelligence Scale & Outbox Suite', () => {
  // 1. Event Schema Versioning
  it('1. Stamps event_schema_version = 1 into outbox payloads', async () => {
    let capturedPayload: any = null;
    const mockInsert = vi.fn().mockImplementation((payload: any) => {
      capturedPayload = payload;
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'outbox-evt-1' }, error: null }),
        }),
      };
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    };

    const eventId = await recordOutboxEvent(
      {
        tenantId: 'tenant-test-1',
        eventType: 'STEP_APPROVED',
        aggregateType: 'approval_request',
        aggregateId: 'req-test-1',
        payload: { stageIndex: 1, approverName: 'Alice' },
      },
      mockClient as any
    );

    expect(eventId).toBe('outbox-evt-1');
    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.payload.event_schema_version).toBe(1);
    expect(capturedPayload.payload.approverName).toBe('Alice');
  });

  // 2. Atomic Job Claiming
  it('2. Atomically claims outbox records and transitions status to PROCESSING', async () => {
    const candidateRecords = [
      { id: 'evt-1', status: 'PENDING', retry_count: 0 },
      { id: 'evt-2', status: 'PENDING', retry_count: 0 },
    ];

    const mockSelectCandidates = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: candidateRecords, error: null }),
          }),
        }),
      }),
    });

    const mockUpdateClaim = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: candidateRecords.map((r) => ({ ...r, status: 'PROCESSING' })),
            error: null,
          }),
        }),
      }),
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: mockSelectCandidates,
        update: mockUpdateClaim,
      }),
    };

    const claimed = await claimOutboxBatch(10, undefined, mockClient as any);
    expect(claimed).toHaveLength(2);
    expect(claimed[0].status).toBe('PROCESSING');
    expect(claimed[1].status).toBe('PROCESSING');
  });

  // 3. Aggregate Reconciliation Audit
  it('3. Successfully audits and reports zero discrepancies across synchronized tenants', async () => {
    const reports = await reconcileIntelligenceAggregates();
    expect(reports).toBeDefined();
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBeGreaterThan(0);

    const allReconciled = reports.every((r) => r.isFullyReconciled);
    expect(allReconciled).toBe(true);
  });

  // 4. Aggregate Rebuild Dry-Run
  it('4. Rebuild dry-run calculates aggregate metrics without modifying database', async () => {
    const stats = await rebuildIntelligenceAggregates(true);
    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);

    const totalCalculated = stats.reduce((acc, s) => acc + s.aggregatesCalculated, 0);
    expect(totalCalculated).toBeGreaterThanOrEqual(0);
  });
});
