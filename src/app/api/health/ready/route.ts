import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ready
 *
 * Container readiness probe for Coolify/Kubernetes load balancers.
 * Checks external dependencies required to serve requests:
 * - Supabase / PostgreSQL connectivity
 * - Redis reachability (degraded if unavailable, does not block routing)
 *
 * NEVER exposes host PID, OS internals, memory heap, CPU load, or credentials.
 */
export async function GET() {
  const startTime = performance.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = performance.now();
    const { error } = await adminClient.from('tenants').select('count', { count: 'exact', head: true });
    dbLatencyMs = Math.round(performance.now() - dbStart);

    if (error) {
      dbStatus = 'unhealthy';
    }
  } catch {
    dbStatus = 'unhealthy';
  }

  // Optional check for Redis if configured
  let redisStatus = 'not_configured';
  if (process.env.REDIS_URL || process.env.KV_URL || process.env.REDIS_HOST) {
    try {
      const { getRedisClient } = await import('@/lib/redis/client');
      const redis = getRedisClient();
      if (redis) {
        const pingStart = performance.now();
        await redis.ping();
        redisStatus = 'healthy';
      }
    } catch {
      redisStatus = 'degraded';
    }
  }

  const isReady = dbStatus === 'healthy';
  const totalDurationMs = Math.round(performance.now() - startTime);

  const payload = {
    status: isReady ? (redisStatus === 'degraded' ? 'degraded' : 'ok') : 'unhealthy',
    service: 'sigmago-web',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      redis: {
        status: redisStatus,
      },
    },
  };

  return NextResponse.json(payload, {
    status: isReady ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Server-Timing': `db;dur=${dbLatencyMs}, total;dur=${totalDurationMs}`,
    },
  });
}
