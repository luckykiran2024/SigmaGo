'use server';

import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function confirmEmailAction(
  tenantSubdomain: string,
  token: string,
  intent: 'approve' | 'reject' | 'discuss',
  comment: string
) {
  // 1. Resolve tenant ID
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // 2. Atomically consume token and execute step action in a single DB transaction
  const { data: result, error: rpcError } = await adminClient.rpc('sigmago_consume_action_token_and_act', {
    p_token: token,
    p_tenant_id: tenant.id,
    p_intent: intent,
    p_comment: comment || null,
  });

  if (rpcError) {
    console.error('Error executing atomic token action RPC:', rpcError);
    throw new Error(rpcError.message || 'Failed to process email action');
  }

  const requestId = result?.request_id;

  // 3. Post-action notifications (if discussion requested)
  if (intent === 'discuss') {
    try {
      const { data: actorUser } = await adminClient
        .from('users')
        .select('name, email')
        .eq('id', result.approver_id)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const { data: request } = await adminClient
        .from('approval_requests')
        .select('owner_id, owner:users!owner_id(email)')
        .eq('id', requestId)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const ownerEmail = (request?.owner as any)?.email;
      const { sendDiscussionNotificationEmail } = await import('@/lib/email/outbound');
      if (ownerEmail) {
        await sendDiscussionNotificationEmail(tenantSubdomain, requestId, comment, actorUser?.name || 'An approver', ownerEmail);
      }
    } catch (notifyErr) {
      console.error('Non-blocking discussion notification error:', notifyErr);
    }
  }

  if (requestId) {
    revalidatePath(`/${tenantSubdomain}/requests/${requestId}`);
  }
}

