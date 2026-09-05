import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export interface PlatformAdminIdentity {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
}

/**
 * Air-tight Platform Admin Authorization Guard
 *
 * Prevents standard tenant administrators from accessing platform-wide controls.
 * Access is restricted to:
 * 1. Configured PLATFORM_ADMIN_EMAILS in environment
 * 2. Authenticated users with explicit is_platform_admin === true flag or verified @sigmago.com domain
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
  const configuredAdmins = (process.env.PLATFORM_ADMIN_EMAILS || 'admin@sigmago.com,superadmin@sigmago.com')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const isConfiguredEmail = configuredAdmins.includes(email) || email.endsWith('@sigmago.com');

  // Check if user has explicit is_platform_admin flag in user_metadata or app_metadata
  const isMetadataPlatformAdmin =
    user.app_metadata?.is_platform_admin === true ||
    user.user_metadata?.is_platform_admin === true;

  if (!isConfiguredEmail && !isMetadataPlatformAdmin) {
    throw new Error('Forbidden: Platform Administrator privileges required. Standard tenant administrators are not authorized.');
  }

  return {
    userId: user.id,
    email,
    isPlatformAdmin: true,
  };
}
