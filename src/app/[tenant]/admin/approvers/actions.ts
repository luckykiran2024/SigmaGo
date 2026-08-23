'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function addApproverToRegisterAction(payload: {
  tenantId: string;
  email: string;
  addedBy: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: newApprover, error: insertErr } = await adminClient
    .from('approvers')
    .upsert(
      {
        tenant_id: payload.tenantId,
        email: payload.email.toLowerCase().trim(),
        added_by: payload.addedBy,
        added_at: new Date().toISOString(),
        removed_at: null,
        note: payload.note || 'Added to Approver Register',
      },
      { onConflict: 'tenant_id,email' }
    )
    .select()
    .single();

  if (insertErr) throw insertErr;

  revalidatePath('/[tenant]/admin/approvers', 'page');
  return newApprover;
}
