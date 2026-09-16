import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getLive } from '@/app/api/health/live/route';
import { GET as getReady } from '@/app/api/health/ready/route';
import { GET as getLegacy } from '@/app/api/health/route';

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Health & Readiness Endpoints (src/app/api/health/*)', () => {
  it('1. GET /api/health/live returns 200 without DB/Redis access', async () => {
    const res = await getLive();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('sigmago-web');
    expect(data.timestamp).toBeDefined();

    // Verify it does NOT leak PID, memory, or CPU
    expect(data.pid).toBeUndefined();
    expect(data.cpu).toBeUndefined();
    expect(data.memory).toBeUndefined();
    expect(data.process).toBeUndefined();
  });

  it('2. GET /api/health/ready returns 200 when database is healthy', async () => {
    const res = await getReady();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.checks.database.status).toBe('healthy');
    expect(data.checks.database.latencyMs).toBeDefined();

    // Verify it does NOT leak internal OS/process metrics
    expect(data.metrics).toBeUndefined();
    expect(data.cpu).toBeUndefined();
  });

  it('3. GET /api/health (legacy) returns clean sanitized payload without internal process leaks', async () => {
    const res = await getLegacy();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBeDefined();

    // Ensure CPU, Memory, and Process metrics were removed
    expect(data.metrics).toBeUndefined();
    expect(data.cpu).toBeUndefined();
    expect(data.memory).toBeUndefined();
    expect(data.process).toBeUndefined();
  });
});
