function extractPlainTextFromTiptap(doc: any): string {
  if (!doc) return 'No justification provided.';
  
  if (typeof doc === 'string') {
    try {
      const parsed = JSON.parse(doc);
      return extractPlainTextFromTiptap(parsed);
    } catch (e) {
      return doc;
    }
  }

  let text = '';
  
  function walk(node: any) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      text += node.text;
    }
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
    if (node.type === 'paragraph' && text.length > 0 && !text.endsWith('\n')) {
      text += '\n';
    }
  }

  walk(doc);
  return text.trim() || 'No justification provided.';
}

import { adminClient } from '../supabase/admin';
import crypto from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function generateActionToken(
  stepId: string,
  approverId: string,
  requestId: string,
  tenantId: string
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // expires in 7 days

  const { error } = await adminClient
    .from('action_tokens')
    .insert({
      token,
      step_id: stepId,
      approver_id: approverId,
      request_id: requestId,
      tenant_id: tenantId,
      expires_at: expiresAt.toISOString()
    });

  if (error) {
    console.error("Error creating action token:", error);
    throw error;
  }

  return token;
}

export async function sendOutboundEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[EMAIL SEND] To: ${to} | Subject: ${subject}`);
  
  if (!RESEND_API_KEY) {
    console.log("------------------ FALLBACK EMAIL CONTEXT ------------------");
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log("HTML CONTENT:");
    console.log(html);
    console.log("-------------------------------------------------------------");
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend API Error: ${res.status} - ${errText}`);
      return false;
    }

    const resData = await res.json();
    console.log(`Email sent successfully via Resend. ID: ${resData.id}`);
    return true;
  } catch (err) {
    console.error("Failed to send email via Resend:", err);
    return false;
  }
}

export async function sendApprovalActionEmail(
  tenantSubdomain: string,
  stepId: string,
  approverEmail: string
): Promise<void> {
  // Resolve tenant info first
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name, logo_url')
    .eq('subdomain', tenantSubdomain)
    .single();
  const tenantName = tenant ? tenant.name : 'Workspace';

  // Check user notification preferences within tenant
  const { data: recipientProfile } = await adminClient
    .from('users')
    .select('user_settings')
    .eq('email', approverEmail)
    .eq('tenant_id', tenant?.id)
    .maybeSingle();

  const settings = (recipientProfile?.user_settings || {}) as any;
  if (settings.action_needed_emails === false) {
    console.log(`Skipping sendApprovalActionEmail to ${approverEmail} due to preferences.`);
    return;
  }
  
  const headerHtml = `
    <div style="background-color: #101828; padding: 20px; border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -20px -20px 20px -20px; text-align: left;">
      ${tenant?.logo_url 
        ? `<img src="${tenant.logo_url}" alt="${tenantName}" style="max-height: 32px; display: block;" />` 
        : `<div style="font-family: sans-serif; font-size: 18px; font-weight: 800; color: #F2F0E8;">SigmaGo | <span style="font-size: 12px; font-weight: 600; color: #A8B0A2;">${tenantName}</span></div>`
      }
    </div>
  `;

  // Fetch step details
  const { data: step, error: stepError } = await adminClient
    .from('approval_steps')
    .select(`
      id,
      approver_id,
      request_id,
      stage_index,
      approval_requests (
        tenant_id,
        subject,
        body_json,
        categories ( name ),
        users!owner_id ( name )
      )
    `)
    .eq('id', stepId)
    .single();

  if (stepError || !step) {
    console.error("Error fetching step for action email:", stepError);
    return;
  }

  const req = step.approval_requests as any;
  const categoryName = req.categories?.name || 'General';
  const ownerName = req.users?.name || 'Unknown';
  const tenantId = req.tenant_id;
  
  // Parse body text from editor JSON if applicable
  const justification = extractPlainTextFromTiptap(req.body_json);

  // Generate action token
  const token = await generateActionToken(stepId, step.approver_id || '', step.request_id, tenantId);

  // Build confirmation links
  const approveUrl = `${APP_URL}/${tenantSubdomain}/act/${token}?intent=approve`;
  const rejectUrl = `${APP_URL}/${tenantSubdomain}/act/${token}?intent=reject`;
  const discussUrl = `${APP_URL}/${tenantSubdomain}/act/${token}?intent=discuss`;
  const viewUrl = `${APP_URL}/${tenantSubdomain}/requests/${step.request_id}`;

  const subject = `[Action needed] ${req.subject}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid rgba(30,43,28,.12); border-radius: 12px; background-color: #F7F8FA; color: #4B5347;">
      ${headerHtml}
      <h2 style="color: #17200F; font-weight: 800; border-bottom: 1px solid rgba(30,43,28,.12); padding-bottom: 10px; margin-top: 0;">Approval Required</h2>
      <p style="font-size: 14px; color: #4B5347; font-weight: 500;">A request requires your review.</p>
      
      <table style="width: 100%; font-size: 14px; margin: 20px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #667085; width: 120px;">Subject</td>
          <td style="padding: 6px 0; color: #17200F; font-weight: bold;">${req.subject}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #667085;">Category</td>
          <td style="padding: 6px 0; color: #17200F;">${categoryName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #667085;">Raised By</td>
          <td style="padding: 6px 0; color: #17200F;">${ownerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #667085;">Current Stage</td>
          <td style="padding: 6px 0; color: #17200F;">Stage ${step.stage_index + 1}</td>
        </tr>
      </table>
 
      <div style="background-color: #F1EEE4; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #C9A227;">
        <h4 style="margin: 0 0 10px 0; color: #17200F;">Justification Summary</h4>
        <div style="font-size: 13px; color: #4B5347; line-height: 1.5;">${justification}</div>
      </div>
 
      <div style="margin: 30px 0; text-align: center;">
        <a href="${approveUrl}" style="background-color: #C9A227; color: #17200F; padding: 10px 24px; text-decoration: none; font-weight: bold; border-radius: 9999px; margin-right: 8px; display: inline-block;">Approve</a>
        <a href="${rejectUrl}" style="background-color: transparent; border: 2px solid #B4453C; color: #B4453C; padding: 8px 22px; text-decoration: none; font-weight: bold; border-radius: 9999px; margin-right: 8px; display: inline-block;">Reject</a>
        <a href="${discussUrl}" style="background-color: transparent; border: 2px solid #3B6B8F; color: #3B6B8F; padding: 8px 22px; text-decoration: none; font-weight: bold; border-radius: 9999px; display: inline-block;">Discuss</a>
      </div>
 
      <p style="font-size: 12px; color: #667085; text-align: center; border-top: 1px solid rgba(30,43,28,.12); padding-top: 15px;">
        You can also <a href="${viewUrl}" style="color: #C9A227; text-decoration: none; font-weight: bold;">Open in SigmaGo</a> to view details.
      </p>
    </div>
  `;

  await sendOutboundEmail(approverEmail, subject, html);
}

export async function sendFyiEmail(
  tenantSubdomain: string,
  stepId: string,
  recipientEmail: string
): Promise<void> {
  // Resolve tenant info
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name, logo_url')
    .eq('subdomain', tenantSubdomain)
    .single();
  const tenantName = tenant ? tenant.name : 'Workspace';

  // Check user notification preferences first strictly within tenant
  const { data: recipientProfile } = await adminClient
    .from('users')
    .select('user_settings')
    .eq('email', recipientEmail)
    .eq('tenant_id', tenant?.id || '')
    .maybeSingle();

  const settings = (recipientProfile?.user_settings || {}) as any;
  if (settings.fyi_emails === false) {
    console.log(`Skipping sendFyiEmail to ${recipientEmail} due to preferences.`);
    return;
  }
  
  const headerHtml = `
    <div style="background-color: #101828; padding: 20px; border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -20px -20px 20px -20px; text-align: left;">
      ${tenant?.logo_url 
        ? `<img src="${tenant.logo_url}" alt="${tenantName}" style="max-height: 32px; display: block;" />` 
        : `<div style="font-family: sans-serif; font-size: 18px; font-weight: 800; color: #F2F0E8;">SigmaGo | <span style="font-size: 12px; font-weight: 600; color: #A8B0A2;">${tenantName}</span></div>`
      }
    </div>
  `;


  const { data: step, error: stepError } = await adminClient
    .from('approval_steps')
    .select(`
      id,
      approval_requests!request_id (
        id,
        ref,
        subject,
        owner:users!owner_id ( name )
      )
    `)
    .eq('id', stepId)
    .single();

  if (stepError || !step || !step.approval_requests) {
    console.error("sendFyiEmail: Failed to load step details:", stepError);
    return;
  }

  const req = step.approval_requests as any;
  const ownerName = req.owner?.name || 'A team member';

  const subject = `FYI: ${ownerName} submitted "${req.subject}" (${req.ref})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 24px;">
          ${headerHtml}
          <div style="margin-bottom: 24px;">
            <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">FYI: Request Submitted</h2>
            <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">
              You have been included as an informed participant on this request. No approval action is required from you.
            </p>
          </div>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Reference</div>
            <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 12px;">${req.ref}</div>
            
            <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Subject</div>
            <div style="font-size: 15px; font-weight: 500; color: #111827; margin-bottom: 12px;">${req.subject}</div>

            <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Submitted By</div>
            <div style="font-size: 14px; color: #111827;">${ownerName}</div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://${tenantSubdomain}.sigmago.app/requests/${req.id}" style="display: inline-block; background-color: #111827; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
              View Request in SigmaGo
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              This is an informational notification from SigmaGo.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendOutboundEmail(recipientEmail, subject, html);
}

export async function sendDiscussionNotificationEmail(
  tenantSubdomain: string,
  requestId: string,
  comment: string,
  raiserName: string,
  ownerEmail: string
): Promise<void> {
  // Resolve tenant info first
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name, logo_url')
    .eq('subdomain', tenantSubdomain)
    .single();
  const tenantName = tenant ? tenant.name : 'Workspace';

  // Check user notification preferences within tenant
  const { data: recipientProfile } = await adminClient
    .from('users')
    .select('user_settings')
    .eq('email', ownerEmail)
    .eq('tenant_id', tenant?.id)
    .maybeSingle();

  const settings = (recipientProfile?.user_settings || {}) as any;
  if (settings.action_needed_emails === false) {
    console.log(`Skipping sendDiscussionNotificationEmail to ${ownerEmail} due to preferences.`);
    return;
  }

  const headerHtml = `
    <div style="background-color: #101828; padding: 20px; border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -20px -20px 20px -20px; text-align: left;">
      ${tenant?.logo_url 
        ? `<img src="${tenant.logo_url}" alt="${tenantName}" style="max-height: 32px; display: block;" />` 
        : `<div style="font-family: sans-serif; font-size: 18px; font-weight: 800; color: #F2F0E8;">SigmaGo | <span style="font-size: 12px; font-weight: 600; color: #A8B0A2;">${tenantName}</span></div>`
      }
    </div>
  `;

  const { data: request } = await adminClient
    .from('approval_requests')
    .select('subject')
    .eq('id', requestId)
    .eq('tenant_id', tenant?.id)
    .single();

  if (!request) return;

  const viewUrl = `${APP_URL}/${tenantSubdomain}/requests/${requestId}`;
  const subject = `[Discussion Requested] ${request.subject}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid rgba(30,43,28,.12); border-radius: 12px; background-color: #F7F8FA; color: #4B5347;">
      ${headerHtml}
      <h2 style="color: #17200F; font-weight: 800; border-bottom: 1px solid rgba(30,43,28,.12); padding-bottom: 10px; margin-top: 0;">Discussion Required</h2>
      <p style="font-size: 14px; color: #4B5347;">
        Approver <strong>${raiserName}</strong> has requested discussion on your request: <strong>${request.subject}</strong>.
      </p>
      
      <div style="background-color: #FBF6E6; border-left: 4px solid #C08A2E; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 5px 0; color: #C08A2E; font-weight: bold;">Approver's Comment</h4>
        <p style="margin: 0; font-size: 13px; color: #17200F; font-style: italic;">"${comment}"</p>
      </div>

      <div style="margin: 25px 0; text-align: center;">
        <a href="${viewUrl}" style="background-color: #C9A227; color: #17200F; padding: 10px 24px; text-decoration: none; font-weight: bold; border-radius: 9999px; display: inline-block;">Resume & Review</a>
      </div>
    </div>
  `;

  await sendOutboundEmail(ownerEmail, subject, html);
}
