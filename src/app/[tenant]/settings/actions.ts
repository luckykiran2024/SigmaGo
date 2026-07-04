'use server';

import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function uploadUserAvatarAction(
  userId: string,
  base64Data: string,
  mimeType: string,
  fileName: string
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    
    const ext = fileName.split('.').pop() || 'png';
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const { data, error } = await adminClient.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = adminClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: dbErr } = await adminClient
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (dbErr) {
      console.error("DB update error:", dbErr);
      return { success: false, error: dbErr.message };
    }

    return { success: true, avatarUrl: publicUrl };
  } catch (err: any) {
    console.error("uploadUserAvatarAction Exception:", err);
    return { success: false, error: err.message };
  }
}

export async function removeUserAvatarAction(userId: string): Promise<void> {
  const { error } = await adminClient
    .from('users')
    .update({ avatar_url: null })
    .eq('id', userId);

  if (error) {
    console.error("Error removing avatar:", error);
    throw error;
  }
}

export async function updateProfileAndSettingsAction(
  userId: string,
  name: string,
  settings: any
): Promise<void> {
  const { error } = await adminClient
    .from('users')
    .update({
      name: name,
      user_settings: settings
    })
    .eq('id', userId);

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
