import { adminClient } from '@/lib/supabase/admin';
import { sendOutboundEmail } from '@/lib/email/outbound';
import { logger } from '@/lib/observability/logger';
import { JobExecutionResult } from './digestJob';

/**
 * Scheduled Job: Approval Reminders / Nudge Scan
 * Scans for overdue pending approval steps and dispatches reminder notifications.
 */
export async function runNudgeJob(): Promise<JobExecutionResult> {
  const startTime = performance.now();
  const jobName = 'nudge';

  try {
    logger.info(`[Job:${jobName}] Starting overdue approval reminders scan...`);

    const { data: pendingSteps, error: stepsErr } = await adminClient
      .from('approval_steps')
      .select(`
        id, approver_id, updated_at, request_id,
        approver:users!approver_id ( id, email, name, user_settings ),
        request:approval_requests!request_id (
          id, subject, tenant_id,
          tenants!tenant_id ( id, subdomain, tenant_settings )
        )
      `)
      .eq('status', 'pending');

    if (stepsErr) throw stepsErr;

    if (!pendingSteps || pendingSteps.length === 0) {
      const durationMs = Math.round(performance.now() - startTime);
      logger.info(`[Job:${jobName}] No pending steps require reminder nudges`, { durationMs });
      return { jobName, success: true, affectedCount: 0, durationMs };
    }

    let sentCount = 0;
    const now = Date.now();

    for (const step of pendingSteps) {
      const approver = step.approver as any;
      const req = step.request as any;
      const tenant = req?.tenants as any;

      if (!approver || !approver.email || !req || !tenant || !tenant.subdomain) {
        continue;
      }

      const tenantSettings = tenant.tenant_settings || {};
      const userSettings = approver.user_settings || {};

      if (tenantSettings.reminders_enabled === false || userSettings.overdue_reminders === false) {
        continue;
      }

      const hoursPending = (now - new Date(step.updated_at).getTime()) / (3600 * 1000);
      const delay = tenantSettings.reminder_delay_hours || 48;
      const interval = tenantSettings.reminder_interval_hours || 24;

      if (hoursPending >= delay) {
        const hoursOverDelay = hoursPending - delay;
        const remainder = hoursOverDelay % interval;

        if (remainder < 1) {
          const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${tenant.subdomain}/requests/${step.request_id}`;
          const subject = `[REMINDER] Action needed on request: ${req.subject}`;
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
              <h2 style="color: #17324D; font-weight: bold; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Overdue Approval Reminder</h2>
              <p style="font-size: 14px; color: #526679;">This is an automated reminder that a decision request is pending your review.</p>
              <div style="margin: 20px 0; background-color: #F6F8F9; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #182B3D; font-weight: bold;">Subject: ${req.subject}</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #637587;">Pending for: ${Math.round(hoursPending)} hours</p>
              </div>
              <div style="margin: 25px 0;">
                <a href="${viewUrl}" style="background-color: #17324D; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Open in SigmaGo</a>
              </div>
            </div>
          `;

          await sendOutboundEmail(approver.email, subject, html);
          sentCount++;
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    logger.info(`[Job:${jobName}] Successfully sent overdue reminder nudges`, {
      jobName,
      affectedCount: sentCount,
      durationMs,
    });

    return { jobName, success: true, affectedCount: sentCount, durationMs };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error(`[Job:${jobName}] Overdue nudge scan failed`, err, { jobName, durationMs });
    return { jobName, success: false, affectedCount: 0, durationMs, error: err.message };
  }
}
