'use server';

import { adminClient } from '@/lib/supabase/admin';
import { requireTenantAdmin } from '@/lib/auth/guards';
import { syncOrganization, EmployeeRow } from '@/lib/db/orgSync';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { encryptSecret } from '@/lib/crypto/secrets';

export async function importOrgCsvAction(tenantSubdomain: string, rows: EmployeeRow[]) {
  const { tenantId, profile } = await requireTenantAdmin(tenantSubdomain);
  const result = await syncOrganization(tenantId, rows, profile.id);
  revalidatePath(`/${tenantSubdomain}/admin/org`);
  return result;
}

export async function regenerateHrmsSecretAction(tenantSubdomain: string) {
  const { tenantId } = await requireTenantAdmin(tenantSubdomain);
  const newSecret = 'hrms_' + crypto.randomBytes(24).toString('hex');
  const encryptedSecret = encryptSecret(newSecret);

  const { error } = await adminClient
    .from('tenants')
    .update({
      hrms_sync_secret: encryptedSecret,
      secret_rotated_at: new Date().toISOString(),
      secret_version: 1,
    })
    .eq('id', tenantId);

  if (error) throw new Error('Failed to update sync secret: ' + error.message);
  revalidatePath(`/${tenantSubdomain}/admin/org`);
  return newSecret;
}
