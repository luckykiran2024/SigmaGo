import { describe, it, expect, vi } from 'vitest';
import {
  computeBackoffDelayMs,
  markOutboxEventFailed,
  runOutboxWorkerCycle,
  MAX_RETRIES,
  OutboxRecord,
} from '../lib/events/outbox';

describe('Self-Healing Outbox Resilience & DLQ Suite (src/lib/events/outbox.ts)', () => {
  it('1. Computes exponential backoff delays with random jitter', () => {
    const delay0 = computeBackoffDelayMs(0); // ~1s + jitter
    const delay1 = computeBackoffDelayMs(1); // ~2s + jitter
    const delay2 = computeBackoffDelayMs(2); // ~4s + jitter
    const delay3 = computeBackoffDelayMs(3); // ~8s + jitter

    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    expect(delay3).toBeGreaterThanOrEqual(8000);
    expect(delay3).toBeGreaterThan(delay2);
  });

  it('2. Transitions failed event to DEAD_LETTER after reaching MAX_RETRIES', async () => {
    let capturedUpdate: any = null;
    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((payload) => {
          capturedUpdate = payload;
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      }),
    };

    // Attempt retry 4 -> nextRetry is 5 (= MAX_RETRIES)
    await markOutboxEventFailed('evt-999', 4, 'Permanent HTTP 500 error from downstream', mockClient as any);

    expect(capturedUpdate).toBeDefined();
    expect(capturedUpdate.status).toBe('DEAD_LETTER');
    expect(capturedUpdate.retry_count).toBe(5);
    expect(capturedUpdate.error_message).toContain('Permanent HTTP 500');
  });

  it('3. Runs outbox worker cycles until queue is drained', async () => {
    const mockEvents: OutboxRecord[] = [
      {
        id: 'e1',
        tenant_id: 't1',
        event_type: 'DECISION_CREATED',
        aggregate_type: 'DECISION',
        aggregate_id: 'd1',
        payload: {},
        status: 'PROCESSING',
        retry_count: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'e2',
        tenant_id: 't1',
        event_type: 'DECISION_SEALED',
        aggregate_type: 'DECISION',
        aggregate_id: 'd2',
        payload: {},
        status: 'PROCESSING',
        retry_count: 0,
        created_at: new Date().toISOString(),
      },
    ];

    let cycleCount = 0;
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'transactional_outbox') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => {
                      cycleCount++;
                      if (cycleCount === 1) {
                        return Promise.resolve({ data: mockEvents, error: null });
                      }
                      return Promise.resolve({ data: [], error: null });
                    }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
                }),
              }),
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    };

    const handler = vi.fn().mockResolvedValue(undefined);
    const result = await runOutboxWorkerCycle(handler, {
      batchSize: 10,
      maxCycles: 5,
      client: mockClient,
    });

    expect(result.cyclesCompleted).toBe(2); // 1st processed, 2nd empty -> terminated
    expect(result.totalProcessed).toBe(2);
    expect(result.totalFailed).toBe(0);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
