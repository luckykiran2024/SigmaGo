import { NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/lib/security/cronAuth';
import { runNudgeJob } from '@/jobs/nudgeJob';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authResult = verifyCronAuthorization(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.reason || 'Unauthorized' }, { status: 401 });
    }

    const result = await runNudgeJob();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, nudgedCount: result.affectedCount, durationMs: result.durationMs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
