'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !signInData.user) {
    return redirect(`/login?message=${encodeURIComponent(error?.message || 'Login failed')}`);
  }

  // Resolve user profile to find their tenant subdomain
  const profile = await getProfileForAuthUser(signInData.user.id, signInData.user.email || email);
  
  let redirectPath = '/meridian';
  if (profile) {
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('subdomain')
      .eq('id', profile.tenant_id)
      .single();

    if (tenant) {
      redirectPath = `/${tenant.subdomain}`;
    }
  }

  return redirect(redirectPath);
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) {
    return redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  // With Supabase email confirmation OFF, the signup is immediately usable.
  // We send them to the login page with a success message.
  return redirect('/login?message=Account created successfully. Please sign in.');
}

export async function resetPassword(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset`,
  });

  if (error) {
    throw new Error(error.message);
  }
}
