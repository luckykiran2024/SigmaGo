import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(url, key);

const targetAccounts = [
  { email: 'sigmago596+mrd@gmail.com', name: 'Meridian Admin', role: 'admin', password: 'Password@123' },
  { email: 'sigmago596+mrd003@gmail.com', name: 'Krishna Pillai', role: 'member', password: 'Password@123' },
  { email: 'sigmago596+mrd019@gmail.com', name: 'Simran Desai', role: 'member', password: 'Password@123' },
  { email: 'vijay.reddy@meridian.com', name: 'Vijay Reddy', role: 'admin', password: 'Password@123' },
  { email: 'krishna.pillai@meridian.com', name: 'Krishna Pillai (Corp)', role: 'member', password: 'Password@123' },
];

async function updatePasswords() {
  console.log('Setting standard passwords for test accounts...\n');

  for (const acc of targetAccounts) {
    // 1. Find user in auth
    const { data: authData } = await adminClient.auth.admin.listUsers();
    let authUser = authData?.users?.find(u => u.email === acc.email);

    if (!authUser) {
      console.log(`Creating missing auth user: ${acc.email}`);
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
      });
      if (createErr) {
        console.error(`Failed to create ${acc.email}:`, createErr.message);
        continue;
      }
      authUser = created.user;
    } else {
      console.log(`Updating password for existing user: ${acc.email}`);
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(authUser.id, {
        password: acc.password,
        email_confirm: true,
      });
      if (updateErr) {
        console.error(`Failed to update password for ${acc.email}:`, updateErr.message);
        continue;
      }
    }

    console.log(`✓ Password set successfully for: ${acc.email}`);
  }

  console.log('\nAll account passwords updated successfully to: Password@123');
}

updatePasswords();
