'use server';

import { createClient } from '@/lib/supabase/server';
import { getProfileForAuthUser } from '@/lib/db/users';
import { issueIntelligenceGrant, revokeIntelligenceGrant, IntelligenceScope } from '@/lib/intelligence/access';
import { revalidatePath } from 'next/cache';

async function assertTenantAdmin(tenantId?: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    throw new Error('Unauthorized: Profile not found');
  }

  if (tenantId && profile.tenant_id !== tenantId) {
    throw new Error('Forbidden: Cross-tenant access forbidden');
  }

  const role = (profile.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin' && role !== 'owner') {
    throw new Error('Forbidden: Tenant Administrator privileges required');
  }

  return { user, profile };
}

export async function issueIntelligenceGrantAction(payload: {
  tenantId?: string;
  email: string;
  scope?: IntelligenceScope;
  grantedBy?: string;
  reason: string;
  expiresAt?: string | null;
}) {
  try {
    const { profile } = await assertTenantAdmin(payload.tenantId);

    const grant = await issueIntelligenceGrant({
      ...payload,
      tenantId: profile.tenant_id,
      grantedBy: profile.id,
    });
    revalidatePath('/[tenant]/admin/intelligence', 'page');
    return { success: true, grant };
  } catch (err: any) {
    console.error('issueIntelligenceGrantAction error:', err);
    return { success: false, error: err.message || 'Failed to issue grant' };
  }
}

export async function revokeIntelligenceGrantAction(payload: {
  grantId: string;
  tenantId?: string;
  revokedBy?: string;
  revokeReason: string;
}) {
  try {
    const { profile } = await assertTenantAdmin(payload.tenantId);

    const grant = await revokeIntelligenceGrant({
      ...payload,
      tenantId: profile.tenant_id,
      revokedBy: profile.id,
    });
    revalidatePath('/[tenant]/admin/intelligence', 'page');
    return { success: true, grant };
  } catch (err: any) {
    console.error('revokeIntelligenceGrantAction error:', err);
    return { success: false, error: err.message || 'Failed to revoke grant' };
  }
}
