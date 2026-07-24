import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const now = new Date();

    // Query all active approved requests with valid_until set
    const { data: requests, error } = await adminClient
      .from('approval_requests')
      .select(`
        id, ref, subject, valid_until, tenant_id,
        users!owner_id ( name, email ),
        tenants ( subdomain )
      `)
      .eq('status', 'approved')
      .not('valid_until', 'is', null);

    if (error) throw error;

    let nudgedCount = 0;

    for (const r of requests || []) {
      const until = new Date(r.valid_until!);
      const diffMs = until.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Trigger notifications at 30, 15, 7 days, and on expiry day (0)
      if ([30, 15, 7, 0].includes(diffDays)) {
        nudgedCount++;
        console.log(`[Validity Cron] Nudge for ${r.ref} (${diffDays} days left) -> ${(r.users as any)?.email}`);
        // Log audit event for cron nudge
        await adminClient.from('audit_log').insert({
          tenant_id: r.tenant_id,
          request_id: r.id,
          actor_id: (r.users as any)?.id || r.id,
          action_type: 'validity_nudge_sent',
          metadata: { days_remaining: diffDays, ref: r.ref }
        });
      }
    }

    return NextResponse.json({ success: true, nudgedCount, timestamp: now.toISOString() });
  } catch (err: any) {
    console.error("Validity Nudge Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
