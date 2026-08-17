import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = performance.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = performance.now();
    const { error } = await adminClient.from('tenants').select('count', { count: 'exact', head: true });
    dbLatencyMs = Math.round(performance.now() - dbStart);

    if (error) {
      dbStatus = 'degraded';
    }
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  const totalDurationMs = Math.round(performance.now() - startTime);

  // Retrieve comprehensive CPU, Memory, OS, and Process metrics
  const systemMetrics = logger.getSystemMetrics();

  const healthData = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
    metrics: {
      cpu: systemMetrics.cpu,
      memory: systemMetrics.memory,
      process: systemMetrics.process,
    },
    performance: {
      responseTimeMs: totalDurationMs,
    },
  };

  const httpStatus = dbStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(healthData, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Server-Timing': `db;dur=${dbLatencyMs}, total;dur=${totalDurationMs}`,
    },
  });
}
