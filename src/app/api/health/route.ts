import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

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

  const healthData = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
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
