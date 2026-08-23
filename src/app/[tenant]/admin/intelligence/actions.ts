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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const grant = await issueIntelligenceGrant(payload);
  revalidatePath('/[tenant]/admin/intelligence', 'page');
  return grant;
}

export async function revokeIntelligenceGrantAction(payload: {
  grantId: string;
  tenantId: string;
  revokedBy: string;
  revokeReason: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const grant = await revokeIntelligenceGrant(payload);
  revalidatePath('/[tenant]/admin/intelligence', 'page');
  return grant;
}
