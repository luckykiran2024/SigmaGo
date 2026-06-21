'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { syncOrganization, EmployeeRow } from '@/lib/db/orgSync';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

async function checkAdmin(tenantSubdomain: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthenticated');
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenant) throw new Error('Tenant not found');

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    throw new Error('Unauthorized - Admin privileges required');
  }

  return { tenantId: tenant.id, userId: profile.id };
}

export async function importOrgCsvAction(tenantSubdomain: string, rows: EmployeeRow[]) {
  const { tenantId, userId } = await checkAdmin(tenantSubdomain);
  const result = await syncOrganization(tenantId, rows, userId);
  revalidatePath(`/${tenantSubdomain}/admin/org`);
  return result;
}

export async function regenerateHrmsSecretAction(tenantSubdomain: string) {
  const { tenantId } = await checkAdmin(tenantSubdomain);
  const newSecret = 'hrms_' + crypto.randomBytes(24).toString('hex');
  
  const { error } = await adminClient
    .from('tenants')
    .update({ hrms_sync_secret: newSecret })
    .eq('id', tenantId);

  if (error) throw new Error('Failed to update sync secret: ' + error.message);
  revalidatePath(`/${tenantSubdomain}/admin/org`);
  return newSecret;
}
