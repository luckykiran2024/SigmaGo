'use server';

import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/db/users';

const AVATAR_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadUserAvatarAction(
  base64Data: string,
  mimeType: string
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const profile = await getCurrentUser();
    const userId = profile.id;
    const ext = AVATAR_MIME_TYPES[mimeType];
    if (!ext) return { success: false, error: 'Unsupported avatar image type' };
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
      return { success: false, error: 'Avatar must be a non-empty image under 10MB' };
    }
    const formattedDataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    let avatarUrlToSave = formattedDataUrl;

    try {
      const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

      const { data, error } = await adminClient.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (!error && data) {
        const { data: { publicUrl } } = adminClient.storage
          .from('avatars')
          .getPublicUrl(filePath);
        if (publicUrl) {
          avatarUrlToSave = publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Storage upload failed, using data URL fallback:", storageErr);
    }

    const { error: dbErr } = await adminClient
      .from('users')
      .update({ avatar_url: avatarUrlToSave })
      .eq('id', userId)
      .eq('tenant_id', profile.tenant_id);

    if (dbErr) {
      console.error("DB update error:", dbErr);
      return { success: false, error: dbErr.message };
    }

    return { success: true, avatarUrl: avatarUrlToSave };
  } catch (err: any) {
    console.error("uploadUserAvatarAction Exception:", err);
    return { success: false, error: err.message };
  }
}


export async function removeUserAvatarAction(): Promise<void> {
  const profile = await getCurrentUser();
  const { error } = await adminClient
    .from('users')
    .update({ avatar_url: null })
    .eq('id', profile.id)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error("Error removing avatar:", error);
    throw error;
  }
}

export async function updateProfileAndSettingsAction(
  name: string,
  settings: any
): Promise<void> {
  const profile = await getCurrentUser();
  if (typeof name !== 'string') throw new Error('Invalid display name');
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 200) throw new Error('Invalid display name');
  const allowedThemes = new Set(['light', 'dark', 'midnight', 'forest']);
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
      (settings.theme !== undefined && !allowedThemes.has(settings.theme))) {
    throw new Error('Invalid user settings');
  }
  const safeSettings = {
    theme: settings.theme || 'light',
    action_needed_emails: settings.action_needed_emails !== false,
    fyi_emails: settings.fyi_emails !== false,
    overdue_reminders: settings.overdue_reminders !== false,
  };
  const { error } = await adminClient
    .from('users')
    .update({
      name: trimmedName,
      user_settings: safeSettings
    })
    .eq('id', profile.id)
    .eq('tenant_id', profile.tenant_id);

  if (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
}

export async function changeUserPasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: "Unauthenticated" };
    }

    // 1. Verify current password by signing in with a temp client
    const tempSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: authError } = await tempSupabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (authError) {
      return { success: false, error: "Invalid current password" };
    }

    // 2. Update to new password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("changeUserPasswordAction Exception:", err);
    return { success: false, error: err.message };
  }
}
