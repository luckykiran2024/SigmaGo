import { createClient } from '@/lib/supabase/server';

export interface PlatformAdminIdentity {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
}

/**
 * Air-tight Platform Admin Authorization Guard
 *
 * Prevents standard tenant administrators from accessing platform-wide controls.
 * Access is restricted to ONLY:
 * 1. Users with explicit `is_platform_admin === true` in `app_metadata` (server-controlled, NOT user-controlled)
 * 2. Users whose email is in the explicitly configured `PLATFORM_ADMIN_EMAILS` environment variable
 *
 * SECURITY: user_metadata is user-writable and MUST NOT be trusted.
 * SECURITY: Domain wildcards (e.g. @sigmago.com) are NOT permitted.
 * SECURITY: No default admin emails are baked in—PLATFORM_ADMIN_EMAILS must be explicitly configured.
 */
export async function assertPlatformAdmin(): Promise<PlatformAdminIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const email = (user.email || '').toLowerCase().trim();

  // 1. Check explicit PLATFORM_ADMIN_EMAILS (required in production)
  const envAdmins = process.env.PLATFORM_ADMIN_EMAILS;
  const configuredAdmins = envAdmins
    ? envAdmins.toLowerCase().split(',').map((e) => e.trim()).filter(Boolean)
    : [];

  const isConfiguredEmail = configuredAdmins.includes(email);

  // 2. Check app_metadata ONLY (server-controlled, NOT user-writable)
  // SECURITY: user_metadata is user-writable and MUST NOT be trusted for admin checks
  const isAppMetadataAdmin = user.app_metadata?.is_platform_admin === true;

  if (!isConfiguredEmail && !isAppMetadataAdmin) {
    throw new Error('Forbidden: Platform Administrator privileges required. Standard tenant administrators are not authorized.');
  }

  return {
    userId: user.id,
    email,
    isPlatformAdmin: true,
  };
}
