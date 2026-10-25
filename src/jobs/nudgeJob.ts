import { adminClient } from '@/lib/supabase/admin';
import { sendOutboundEmail } from '@/lib/email/outbound';
import { logger } from '@/lib/observability/logger';
import { JobExecutionResult } from './digestJob';
import { isApprovalReminderDue } from './nudgeSchedule';

const DEFAULT_REMINDER_DELAY_HOURS = 48;
const DEFAULT_REMINDER_INTERVAL_HOURS = 24;
const AUDIT_PAGE_SIZE = 1000;
const REQUEST_ID_BATCH_SIZE = 100;

function positiveHours(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Scheduled Job: Approval Reminders / Nudge Scan
 * Scans overdue approval steps and sends no more than one reminder per configured interval.
 * Last-send timestamps are stored in audit_log so delayed daily scans do not miss the window.
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

    const requestIds = [...new Set(pendingSteps.map((step: any) => step.request_id).filter(Boolean))];
    const maxConfiguredInterval = pendingSteps.reduce((max: number, step: any) => {
      const request = step.request as any;
      const tenant = request?.tenants as any;
      return Math.max(
        max,
        positiveHours(tenant?.tenant_settings?.reminder_interval_hours, DEFAULT_REMINDER_INTERVAL_HOURS),
      );
    }, DEFAULT_REMINDER_INTERVAL_HOURS);
    const cutoffTime = Date.now() - maxConfiguredInterval * 60 * 60 * 1000;
    const reminderCutoff = new Date(Number.isFinite(cutoffTime) ? Math.max(0, cutoffTime) : 0).toISOString();
    const latestReminderByStep = new Map<string, string>();

    // Read reminder events only for requests in this scan and only as far back as
    // the largest configured interval. Paging avoids silently missing older rows.
    for (let batchStart = 0; batchStart < requestIds.length; batchStart += REQUEST_ID_BATCH_SIZE) {
      const requestBatch = requestIds.slice(batchStart, batchStart + REQUEST_ID_BATCH_SIZE);
      for (let offset = 0; ; offset += AUDIT_PAGE_SIZE) {
        const { data: reminderEvents, error: reminderReadError } = await adminClient
          .from('audit_log')
          .select('created_at, metadata')
          .eq('action_type', 'approval_nudge_sent')
          .in('request_id', requestBatch)
          .gte('created_at', reminderCutoff)
          .order('created_at', { ascending: false })
          .range(offset, offset + AUDIT_PAGE_SIZE - 1);

        if (reminderReadError) throw reminderReadError;

        for (const event of reminderEvents || []) {
          const stepId = (event.metadata as Record<string, unknown> | null)?.approval_step_id;
          if (typeof stepId !== 'string') continue;
          const sentAt = String(event.created_at);
          const previous = latestReminderByStep.get(stepId);
          if (!previous || new Date(sentAt).getTime() > new Date(previous).getTime()) {
            latestReminderByStep.set(stepId, sentAt);
          }
        }

        if (!reminderEvents || reminderEvents.length < AUDIT_PAGE_SIZE) break;
      }
    }

    let sentCount = 0;
    let failureCount = 0;
    const now = new Date();

    for (const step of pendingSteps as any[]) {
      const approver = step.approver as any;
      const request = step.request as any;
      const tenant = request?.tenants as any;

      if (!approver?.email || !request || !tenant?.subdomain || !tenant?.id) continue;

      const tenantSettings = tenant.tenant_settings || {};
      const userSettings = approver.user_settings || {};
      if (tenantSettings.reminders_enabled === false || userSettings.overdue_reminders === false) continue;

      const updatedAt = new Date(step.updated_at).getTime();
      const hoursPending = (now.getTime() - updatedAt) / (60 * 60 * 1000);
      const delayHours = positiveHours(tenantSettings.reminder_delay_hours, DEFAULT_REMINDER_DELAY_HOURS);
      const intervalHours = positiveHours(tenantSettings.reminder_interval_hours, DEFAULT_REMINDER_INTERVAL_HOURS);
      const lastSentAt = latestReminderByStep.get(step.id);

      if (!isApprovalReminderDue({ hoursPending, delayHours, intervalHours, lastSentAt, now })) continue;

      const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${tenant.subdomain}/requests/${request.id}`;
      const subject = `[REMINDER] Action needed on request: ${request.subject}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #17324D; font-weight: bold; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Overdue Approval Reminder</h2>
          <p style="font-size: 14px; color: #526679;">This is an automated reminder that a decision request is pending your review.</p>
          <div style="margin: 20px 0; background-color: #F6F8F9; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #182B3D; font-weight: bold;">Subject: ${request.subject}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #637587;">Pending for: ${Math.round(hoursPending)} hours</p>
          </div>
          <div style="margin: 25px 0;">
            <a href="${viewUrl}" style="background-color: #17324D; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Open in SigmaGo</a>
          </div>
        </div>
      `;

      const emailSent = await sendOutboundEmail(approver.email, subject, html);
      if (!emailSent) {
        failureCount++;
        logger.error(`[Job:${jobName}] Reminder email was not accepted`, undefined, {
          requestId: request.id,
          approvalStepId: step.id,
        });
        continue;
      }

      const sentAt = new Date().toISOString();
      const { error: auditWriteError } = await adminClient.from('audit_log').insert({
        tenant_id: tenant.id,
        request_id: request.id,
        actor_id: null,
        action_type: 'approval_nudge_sent',
        metadata: {
          action_source: 'system_cron',
          approval_step_id: step.id,
          reminder_interval_hours: intervalHours,
        },
        created_at: sentAt,
      });

      if (auditWriteError) {
        failureCount++;
        logger.error(`[Job:${jobName}] Reminder sent but its audit event could not be recorded`, auditWriteError, {
          requestId: request.id,
          approvalStepId: step.id,
        });
        continue;
      }

      latestReminderByStep.set(step.id, sentAt);
      sentCount++;
    }

    const durationMs = Math.round(performance.now() - startTime);
    logger.info(`[Job:${jobName}] Overdue reminder scan completed`, {
      jobName,
      affectedCount: sentCount,
      failureCount,
      durationMs,
    });

    return {
      jobName,
      success: failureCount === 0,
      affectedCount: sentCount,
      durationMs,
      ...(failureCount > 0 ? { error: `${failureCount} reminder(s) failed to send or record` } : {}),
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error(`[Job:${jobName}] Overdue nudge scan failed`, err, { jobName, durationMs });
    return { jobName, success: false, affectedCount: 0, durationMs, error: err.message };
  }
}
