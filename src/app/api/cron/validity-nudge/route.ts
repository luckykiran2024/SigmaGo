import { NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/lib/security/cronAuth';
import { runValidityNudgeJob } from '@/jobs/validityNudgeJob';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authResult = verifyCronAuthorization(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.reason || 'Unauthorized' }, { status: 401 });
    }

    const result = await runValidityNudgeJob();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      nudgedCount: result.affectedCount,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
