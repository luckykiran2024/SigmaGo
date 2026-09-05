import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const adminClient = createClient(url, key);

/**
 * Target accounts for password reset.
 * Passwords are generated cryptographically at runtime, never hardcoded.
 */
const targetAccounts = [
  { email: 'sigmago596+mrd@gmail.com', name: 'Meridian Admin', role: 'admin' },
  { email: 'sigmago596+mrd003@gmail.com', name: 'Krishna Pillai', role: 'member' },
  { email: 'sigmago596+mrd019@gmail.com', name: 'Simran Desai', role: 'member' },
  { email: 'vijay.reddy@meridian.com', name: 'Vijay Reddy', role: 'admin' },
  { email: 'krishna.pillai@meridian.com', name: 'Krishna Pillai (Corp)', role: 'member' },
];

/**
 * Generates a cryptographically secure random password.
 * Format: 24 hex characters (96 bits of entropy).
 */
function generateSecurePassword() {
  return randomBytes(12).toString('hex');
}

async function updatePasswords() {
  console.log('Setting cryptographically generated passwords for test accounts...\n');

  const credentials = [];

  for (const acc of targetAccounts) {
    const password = generateSecurePassword();

    // 1. Find user in auth
    const { data: authData } = await adminClient.auth.admin.listUsers();
    let authUser = authData?.users?.find(u => u.email === acc.email);

    if (!authUser) {
      console.log(`Creating missing auth user: ${acc.email}`);
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: password,
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
        password: password,
        email_confirm: true,
      });
      if (updateErr) {
        console.error(`Failed to update password for ${acc.email}:`, updateErr.message);
        continue;
      }
    }

    credentials.push({ email: acc.email, name: acc.name, password });
    console.log(`✓ Password set successfully for: ${acc.email}`);
  }

  console.log('\n--- GENERATED CREDENTIALS (SAVE THESE, SHOWN ONLY ONCE) ---');
  console.table(credentials);
  console.log('\n⚠️  These passwords are cryptographically generated and will NOT be shown again.');
  console.log('   Store them securely in a password manager.');
}

updatePasswords();
