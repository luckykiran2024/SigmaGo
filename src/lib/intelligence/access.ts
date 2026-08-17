import { adminClient } from '@/lib/supabase/admin';

export type IntelligenceScope = 'AGGREGATE_ONLY' | 'FULL';

export interface AccessResolution {
  granted: boolean;
  scope: IntelligenceScope | null;
  grantId: string | null;
}

/**
 * Normalizes email by trimming whitespace and converting to lowercase.
 * Does NOT strip plus-addressing or dots.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Resolves intelligence access for a user.
 * Access is completely decoupled from roles (Admin/HR/Finance).
 * Access is granted ONLY when an active, non-expired, non-revoked IntelligenceGrant exists.
 */
export async function resolveIntelligenceAccess(
  tenantId: string,
  userId: string
): Promise<AccessResolution> {
  try {
    if (!tenantId || !userId) {
      return { granted: false, scope: null, grantId: null };
    }

    // 1. Fetch user to obtain email
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('id, tenant_id, email, status')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (userError || !user || user.status === 'inactive') {
      return { granted: false, scope: null, grantId: null };
    }

    const normalizedEmail = normalizeEmail(user.email);
    if (!normalizedEmail) {
      return { granted: false, scope: null, grantId: null };
    }

    // 2. Query intelligence_grants for matching tenant & normalized email
    const { data: grant, error: grantError } = await adminClient
      .from('intelligence_grants')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('email', normalizedEmail)
      .is('revoked_at', null)
      .maybeSingle();

    if (grantError || !grant) {
      return { granted: false, scope: null, grantId: null };
    }

    // 3. Check expiration
    if (grant.expires_at) {
      const expirationDate = new Date(grant.expires_at);
      if (expirationDate <= new Date()) {
        return { granted: false, scope: null, grantId: null };
      }
    }

    // 4. Update access metrics
    try {
      await adminClient
        .from('intelligence_grants')
        .update({
          access_count: (grant.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', grant.id);
    } catch (metricErr) {
      console.error('Error updating intelligence grant access metrics:', metricErr);
    }

    return {
      granted: true,
      scope: (grant.scope as IntelligenceScope) || 'AGGREGATE_ONLY',
      grantId: grant.id,
    };
  } catch (err) {
    console.error('resolveIntelligenceAccess error:', err);
    return { granted: false, scope: null, grantId: null };
  }
}

/**
 * Issues a new IntelligenceGrant. Requires a minimum reason of 20 characters.
 */
export async function issueIntelligenceGrant(payload: {
  tenantId: string;
  email: string;
  scope?: IntelligenceScope;
  grantedBy: string;
  reason: string;
  expiresAt?: string | null;
  grantRequestId?: string | null;
}) {
  const normalizedEmail = normalizeEmail(payload.email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Invalid email address for intelligence grant');
  }

  if (!payload.reason || payload.reason.trim().length < 20) {
    throw new Error('A detailed reason of at least 20 characters is required to issue an intelligence grant.');
  }

  const { data: grant, error } = await adminClient
    .from('intelligence_grants')
    .upsert(
      {
        tenant_id: payload.tenantId,
        email: normalizedEmail,
        scope: payload.scope || 'AGGREGATE_ONLY',
        granted_by: payload.grantedBy,
        granted_at: new Date().toISOString(),
        grant_request_id: payload.grantRequestId || null,
        reason: payload.reason.trim(),
        expires_at: payload.expiresAt || null,
        revoked_at: null,
        revoked_by: null,
        revoke_reason: null,
      },
      { onConflict: 'tenant_id,email' }
    )
    .select()
    .single();

  if (error) throw error;
  return grant;
}

/**
 * Revokes an existing IntelligenceGrant immediately with a required revocation reason.
 */
export async function revokeIntelligenceGrant(payload: {
  grantId: string;
  tenantId: string;
  revokedBy: string;
  revokeReason: string;
}) {
  if (!payload.revokeReason || payload.revokeReason.trim().length < 10) {
    throw new Error('A valid revocation reason is required to revoke an intelligence grant.');
  }

  const { data: grant, error } = await adminClient
    .from('intelligence_grants')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: payload.revokedBy,
      revoke_reason: payload.revokeReason.trim(),
    })
    .eq('id', payload.grantId)
    .eq('tenant_id', payload.tenantId)
    .select()
    .single();

  if (error) throw error;
  return grant;
}
