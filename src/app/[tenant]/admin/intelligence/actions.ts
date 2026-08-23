'use server';

import { createClient } from '@/lib/supabase/server';
import { issueIntelligenceGrant, revokeIntelligenceGrant, IntelligenceScope } from '@/lib/intelligence/access';
import { revalidatePath } from 'next/cache';

export async function issueIntelligenceGrantAction(payload: {
  tenantId: string;
  email: string;
  scope?: IntelligenceScope;
  grantedBy: string;
  reason: string;
  expiresAt?: string | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized user session' };
    }

    const grant = await issueIntelligenceGrant(payload);
    revalidatePath('/[tenant]/admin/intelligence', 'page');
    return { success: true, grant };
  } catch (err: any) {
    console.error('issueIntelligenceGrantAction error:', err);
    return { success: false, error: err.message || 'Failed to issue grant' };
  }
}

export async function revokeIntelligenceGrantAction(payload: {
  grantId: string;
  tenantId: string;
  revokedBy: string;
  revokeReason: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized user session' };
    }

    const grant = await revokeIntelligenceGrant(payload);
    revalidatePath('/[tenant]/admin/intelligence', 'page');
    return { success: true, grant };
  } catch (err: any) {
    console.error('revokeIntelligenceGrantAction error:', err);
    return { success: false, error: err.message || 'Failed to revoke grant' };
  }
}
