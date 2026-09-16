'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';

async function assertCallerIsTenantAdmin(tenantId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) {
    throw new Error('Unauthorized: User profile not found');
  }

  if (profile.tenant_id !== tenantId) {
    throw new Error('Forbidden: User does not belong to this tenant');
  }

  const role = (profile.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin' && role !== 'owner') {
    throw new Error('Forbidden: Admin privileges required');
  }

  return { user, profile };
}

export async function uploadTenantLogoAction(
  tenantId: string,
  base64Data: string,
  mimeType: string,
  fileName: string
): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
  try {
    await assertCallerIsTenantAdmin(tenantId);

    // 1. Decode base64 data
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    
    // 2. Define storage path: [tenantId]/logo-[timestamp].[ext]
    const ext = fileName.split('.').pop() || 'png';
    const filePath = `${tenantId}/logo-${Date.now()}.${ext}`;

    // 3. Upload to 'logos' bucket
    const { data, error } = await adminClient.storage
      .from('logos')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      return { success: false, error: error.message };
    }

    // 4. Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('logos')
      .getPublicUrl(filePath);

    // 5. Update tenant logo_url in DB
    const { error: dbErr } = await adminClient
      .from('tenants')
      .update({ logo_url: publicUrl })
      .eq('id', tenantId);

    if (dbErr) {
      console.error("DB update error:", dbErr);
      return { success: false, error: dbErr.message };
    }

    return { success: true, logoUrl: publicUrl };
  } catch (err: any) {
    console.error("uploadTenantLogoAction Exception:", err);
    return { success: false, error: err.message };
  }
}

export async function removeTenantLogoAction(tenantId: string): Promise<void> {
  await assertCallerIsTenantAdmin(tenantId);

  const { error } = await adminClient
    .from('tenants')
    .update({ logo_url: null })
    .eq('id', tenantId);

  if (error) {
    console.error("Error removing logo:", error);
    throw error;
  }
}

export async function updateTenantSettingsAction(
  tenantId: string,
  name: string,
  settings: any
): Promise<void> {
  await assertCallerIsTenantAdmin(tenantId);

  const { error } = await adminClient
    .from('tenants')
    .update({
      name: name,
      tenant_settings: settings
    })
    .eq('id', tenantId);

  if (error) {
    console.error("Error updating tenant settings:", error);
    throw error;
  }
}
