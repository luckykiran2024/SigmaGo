'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { revalidatePath } from 'next/cache';

export async function addApproverToRegisterAction(payload: {
  tenantId?: string;
  email: string;
  addedBy?: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    throw new Error('Unauthorized: User profile not found');
  }

  const role = (profile.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin' && role !== 'owner') {
    throw new Error('Forbidden: Tenant Administrator access required');
  }

  // Server-derived identity and tenant
  const tenantId = profile.tenant_id;
  const addedBy = profile.id;

  const { data: newApprover, error: insertErr } = await adminClient
    .from('approvers')
    .upsert(
      {
        tenant_id: tenantId,
        email: payload.email.toLowerCase().trim(),
        added_by: addedBy,
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
