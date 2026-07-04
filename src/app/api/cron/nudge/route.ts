import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Fetch pending steps using simple flat query
    const { data: pendingSteps, error: stepsErr } = await adminClient
      .from('approval_steps')
      .select('id, approver_id, updated_at, request_id')
      .eq('status', 'pending');

    if (stepsErr) throw stepsErr;
    if (!pendingSteps || pendingSteps.length === 0) {
      return NextResponse.json({ success: true, nudgedCount: 0 });
    }

    let sentCount = 0;
    const now = Date.now();

    // 2. Process each step by querying related records flatly
    for (const step of pendingSteps) {
      if (!step.approver_id || !step.request_id) continue;

      // Fetch approver details
      const { data: approver } = await adminClient
        .from('users')
        .select('email, name, user_settings')
        .eq('id', step.approver_id)
        .maybeSingle();

      if (!approver || !approver.email) continue;

      // Fetch request details
      const { data: req } = await adminClient
        .from('approval_requests')
        .select('subject, tenant_id')
        .eq('id', step.request_id)
        .maybeSingle();

      if (!req || !req.tenant_id) continue;

      // Fetch tenant details
      const { data: tenant } = await adminClient
        .from('tenants')
        .select('subdomain, tenant_settings')
        .eq('id', req.tenant_id)
        .maybeSingle();

      if (!tenant || !tenant.subdomain) continue;

      const tenantSettings = tenant.tenant_settings || {};
      const userSettings = approver.user_settings || {};

      // Check if reminders are enabled globally for tenant
      if (tenantSettings.reminders_enabled === false) {
        continue;
      }

      // Check if reminders are enabled per user
      if (userSettings.overdue_reminders === false) {
        continue;
      }

      // Calculate hours pending
      const hoursPending = (now - new Date(step.updated_at).getTime()) / (3600 * 1000);
      const delay = tenantSettings.reminder_delay_hours || 48;
      const interval = tenantSettings.reminder_interval_hours || 24;

      if (hoursPending >= delay) {
        const hoursOverDelay = hoursPending - delay;
        const remainder = hoursOverDelay % interval;

        // Check if remainder is within 1 hour interval (corresponds to cron cadence)
        if (remainder < 1) {
          console.log(`[REMINDER NUDGE] Sending overdue email to approver ${approver.email} for request "${req.subject}"`);
          
          const { sendOutboundEmail } = await import('@/lib/email/outbound');
          const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${tenant.subdomain}/requests/${step.request_id}`;
          
          const subject = `[REMINDER] Action needed: ${req.subject}`;
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
              <h2 style="color: #ef4444; font-weight: 800; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Overdue Reminder</h2>
              <p style="font-size: 14px; color: #555;">This is an automated reminder that a request is pending your approval.</p>
              
              <div style="margin: 20px 0; background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #111; font-weight: bold;">Subject: ${req.subject}</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Pending for: ${Math.round(hoursPending)} hours</p>
              </div>

              <div style="margin: 25px 0;">
                <a href="${viewUrl}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Open in SigmaGo</a>
              </div>
            </div>
          `;

          await sendOutboundEmail(approver.email, subject, html);
          sentCount++;
        }
      }
    }

    return NextResponse.json({ success: true, nudgedCount: sentCount });
  } catch (error: any) {
    console.error("Nudge Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
