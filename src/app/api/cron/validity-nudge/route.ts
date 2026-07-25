import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    // H3 Fix: Authenticate Cron Secret (Vercel Cron header or CRON_SECRET authorization header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron authorization token' }, { status: 401 });
    }

    const now = new Date();

    // Query active approved requests with valid_until set
    const { data: requests, error } = await adminClient
      .from('approval_requests')
      .select(`
        id, ref, subject, valid_until, tenant_id, owner_id,
        users!owner_id ( id, name, email )
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
        
        // H4 Fix: System cron actions write actor_id as NULL with action_source in metadata
        await adminClient.from('audit_log').insert({
          tenant_id: r.tenant_id,
          request_id: r.id,
          actor_id: null, // H4 Fix: System automated actions MUST use null actor_id
          action_type: 'validity_nudge_sent',
          metadata: {
            action_source: 'system_cron', // H4 Fix
            days_remaining: diffDays,
            ref: r.ref,
            owner_email: (r.users as any)?.email
          }
        });
      }
    }

    
    // Forward Basis Expiry Check: Notify decisions whose 'based_on' target decision has expired
    const { data: basisRefs } = await adminClient
      .from('decision_references')
      .select(`
        id,
        tenant_id,
        source_id,
        target_id,
        source_request:approval_requests!decision_references_source_id_fkey(id, ref, subject, owner_id),
        target_request:approval_requests!decision_references_target_id_fkey(id, ref, subject, valid_until, status)
      `)
      .eq('relationship', 'based_on');

    for (const ref of basisRefs || []) {
      const target = ref.target_request as any;
      const source = ref.source_request as any;
      if (target && target.valid_until && new Date(target.valid_until) <= now) {
        nudgedCount++;
        await adminClient.from('audit_log').insert({
          tenant_id: ref.tenant_id,
          request_id: source.id,
          actor_id: null,
          action_type: 'basis_expired_nudge',
          metadata: {
            action_source: 'system_cron',
            basis_ref: target.ref,
            basis_subject: target.subject,
            message: `Decision ${target.ref} which this decision is based on has expired. Review whether this decision is still valid.`
          }
        });
      }
    }

    return NextResponse.json({ success: true, nudgedCount, timestamp: now.toISOString() });
  } catch (err: any) {
    console.error("Validity Nudge Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
