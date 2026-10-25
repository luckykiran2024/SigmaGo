import { adminClient } from '@/lib/supabase/admin';
import { sendOutboundEmail } from '@/lib/email/outbound';
import { logger } from '@/lib/observability/logger';
import { recordQueueMetric } from '@/lib/observability/telemetry';

export interface NudgeJobPayload {
  requestId: string;
  tenantId: string;
  approverId?: string;
  stepId?: string;
}

/**
 * Processes an approval reminder nudge job.
 * Re-resolves current database state server-side rather than trusting enqueued content.
 */
export async function processApprovalNudgeJob(data: NudgeJobPayload): Promise<void> {
  const startTime = performance.now();
  const { requestId, tenantId, approverId } = data;

  try {
    // 1. Verify request is still in pending status
    const { data: request, error: reqErr } = await adminClient
      .from('approval_requests')
      .select('id, ref, subject, status, tenant_id')
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .single();

    if (reqErr || !request) {
      logger.warn('[NudgeWorker] Request not found or mismatched tenant, skipping', {
        requestId,
        tenantId,
      });
      return;
    }

    if (request.status !== 'pending') {
      logger.info('[NudgeWorker] Request already resolved, skipping nudge', {
        requestId,
        tenantId,
        status: request.status,
      });
      return;
    }

    // 2. Fetch pending steps for the target approver (or all pending steps if not specified)
    let query = adminClient
      .from('approval_steps')
      .select(`
        id, approver_id,
        approver:users!approver_id ( id, email, name, user_settings ),
        tenants!tenant_id ( subdomain )
      `)
      .eq('request_id', requestId)
      .eq('status', 'pending');

    if (approverId) {
      query = query.eq('approver_id', approverId);
    }

    const { data: steps, error: stepsErr } = await query;
    if (stepsErr || !steps || steps.length === 0) {
      logger.info('[NudgeWorker] No pending steps to nudge for request', { requestId });
      return;
    }

    for (const step of steps) {
      const approver = (step as any).approver;
      const tenant = (step as any).tenants;
      if (!approver?.email || !tenant?.subdomain) continue;

      if (approver.user_settings?.overdue_reminders === false) {
        continue;
      }

      const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${tenant.subdomain}/requests/${requestId}`;
      const subject = `[REMINDER] Action needed on decision request`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #17324D; font-weight: bold; margin-top: 0;">Decision Approval Reminder</h2>
          <p style="font-size: 14px; color: #526679;">A decision request is currently awaiting your review and approval in SigmaGo.</p>
          <div style="margin: 25px 0;">
            <a href="${viewUrl}" style="background-color: #17324D; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Open Decision Request</a>
          </div>
        </div>
      `;

      await sendOutboundEmail(approver.email, subject, html);
    }

    const durationMs = Math.round(performance.now() - startTime);
    recordQueueMetric('completed', 'approval-nudges', 'send-nudge', durationMs);
    logger.info('[NudgeWorker] Successfully processed approval nudge job', {
      requestId,
      tenantId,
      durationMs,
    });
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    recordQueueMetric('failed', 'approval-nudges', 'send-nudge', durationMs);
    logger.error('[NudgeWorker] Error processing nudge job', err, {
      requestId,
      tenantId,
      durationMs,
    });
    throw err;
  }
}
