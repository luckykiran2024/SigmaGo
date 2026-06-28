'use server';

import { adminClient } from '@/lib/supabase/admin';
import { actOnStep } from '@/lib/db/steps';
import { revalidatePath } from 'next/cache';

export async function confirmEmailAction(
  tenantSubdomain: string,
  token: string,
  intent: 'approve' | 'reject' | 'discuss',
  comment: string
) {
  // 1. Fetch token and verify
  const { data: tokenData, error: tokenError } = await adminClient
    .from('action_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('Token not found');
  }

  if (tokenData.used_at) {
    throw new Error('This action link has already been used');
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    throw new Error('This action link has expired');
  }

  // Fetch step status to ensure it's still pending
  const { data: step, error: stepError } = await adminClient
    .from('approval_steps')
    .select('status, request_id')
    .eq('id', tokenData.step_id)
    .single();

  if (stepError || !step) {
    throw new Error('Approval step not found');
  }

  if (step.status !== 'pending') {
    throw new Error('This step is no longer pending action');
  }

  // 2. Fetch tenant ID
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // 3. Mark token as used
  const { error: tokenUpdateError } = await adminClient
    .from('action_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);

  if (tokenUpdateError) {
    throw new Error('Failed to consume token');
  }

  // 4. Perform the action
  if (intent === 'discuss') {
    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment is required for discussion requests');
    }
    
    // Set request status to 'in_discussion'
    const { error: reqError } = await adminClient
      .from('approval_requests')
      .update({ status: 'in_discussion' })
      .eq('id', tokenData.request_id);

    if (reqError) throw reqError;

    // Get actor info
    const { data: actorUser } = await adminClient
      .from('users')
      .select('name, email')
      .eq('id', tokenData.approver_id)
      .single();

    // Fetch owner email
    const { data: request } = await adminClient
      .from('approval_requests')
      .select('owner_id, owner:users!owner_id(email)')
      .eq('id', tokenData.request_id)
      .single();

    const ownerEmail = (request?.owner as any)?.email;
    
    // Email the owner
    const { sendDiscussionNotificationEmail } = await import('@/lib/email/outbound');
    if (ownerEmail) {
      await sendDiscussionNotificationEmail(tenantSubdomain, tokenData.request_id, comment, actorUser?.name || 'An approver', ownerEmail);
    }

    // Write audit log entry
    await adminClient.from('audit_log').insert({
      tenant_id: tenant.id,
      request_id: tokenData.request_id,
      actor_id: tokenData.approver_id,
      action_type: 'step_discussion',
      metadata: {
        step_id: tokenData.step_id,
        action_source: 'email',
        comment,
        summary: `${actorUser?.name || 'Unknown'} requested discussion via email.`
      }
    });

  } else {
    // Approve or Reject
    const actionVal = intent === 'approve' ? 'approved' : 'rejected';
    await actOnStep({
      stepId: tokenData.step_id,
      action: actionVal,
      actorId: tokenData.approver_id,
      tenantId: tenant.id,
      comment: comment || undefined,
      actionSource: 'email',
      delegationId: undefined
    });
  }

  revalidatePath(`/${tenantSubdomain}/requests/${tokenData.request_id}`);
}
