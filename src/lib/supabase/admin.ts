import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Fail-Closed Service-Role Admin Client
 *
 * In production (NODE_ENV === 'production'), this function throws a fatal
 * error immediately if SUPABASE_SERVICE_ROLE_KEY is not configured.
 * This prevents accidental privilege downgrade to the anon key.
 *
 * Usage boundary: restricted to platform-admin plane operations,
 * authoritative RPC calls (sigmago_act_on_step, sigmago_finalize_seal),
 * and background workers.
 */
export function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
        'Service-role access is unavailable. Refusing to fall back to anon key. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY in the production environment.'
      );
    }
    // In test/dev, warn but allow through with a placeholder
    console.warn('[SECURITY] SUPABASE_SERVICE_ROLE_KEY is not set. Using placeholder for development only.');
  }

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'dev-placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export const adminClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: keyof SupabaseClient) {
    const client = getAdminClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});