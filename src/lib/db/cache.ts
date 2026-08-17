import { unstable_cache } from 'next/cache';
import { adminClient } from '@/lib/supabase/admin';

export const getCachedCategories = unstable_cache(
  async (tenantId: string) => {
    const { data } = await adminClient
      .from('categories')
      .select('id, name, default_visibility, step_type')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });
    return data || [];
  },
  ['tenant-categories'],
  { revalidate: 300, tags: ['categories'] }
);

export const getCachedTenantSettings = unstable_cache(
  async (subdomain: string) => {
    const { data } = await adminClient
      .from('tenants')
      .select('id, name, subdomain, theme_tokens, logo_url')
      .eq('subdomain', subdomain)
      .single();
    return data;
  },
  ['tenant-settings'],
  { revalidate: 300, tags: ['tenant-settings'] }
);
