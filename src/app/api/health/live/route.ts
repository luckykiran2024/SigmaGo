import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/live
 *
 * Lightweight container liveness probe.
 * Answers only whether the web process is alive.
 * Zero external calls to Supabase, PostgreSQL, or Redis.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'sigmago-web',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
