'use server';

import { createClient } from '@/lib/supabase/server';

export async function updatePasswordAction(password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    throw new Error(error.message);
  }
  return true;
}
