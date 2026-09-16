import { adminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';
import { JobExecutionResult } from './digestJob';

/**
 * Scheduled Job: Decision Validity & Expiry Nudge Scan
 * Inspects approved requests approaching expiration and decisions whose 'based_on' references have lapsed.
 */
export async function runValidityNudgeJob(): Promise<JobExecutionResult> {
  const startTime = performance.now();
  const jobName = 'validity-nudge';

  try {
    logger.info(`[Job:${jobName}] Starting decision validity and expiry scan...`);
    const now = new Date();

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

      if ([30, 15, 7, 0].includes(diffDays)) {
        nudgedCount++;
        await adminClient.from('audit_log').insert({
          tenant_id: r.tenant_id,
          request_id: r.id,
          actor_id: null,
          action_type: 'validity_nudge_sent',
          metadata: {
            action_source: 'system_cron',
            days_remaining: diffDays,
            ref: r.ref,
          },
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
            message: `Decision ${target.ref} on which this decision is based has expired.`,
          },
        });
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    logger.info(`[Job:${jobName}] Validity scan completed`, {
      jobName,
      affectedCount: nudgedCount,
      durationMs,
    });

    return { jobName, success: true, affectedCount: nudgedCount, durationMs };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error(`[Job:${jobName}] Validity scan failed`, err, { jobName, durationMs });
    return { jobName, success: false, affectedCount: 0, durationMs, error: err.message };
  }
}
