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
 * Generates a cryptographically secure random password.
 * Format: 24 hex characters (96 bits of entropy).
 */
function generateSecurePassword() {
  return randomBytes(12).toString('hex');
}

async function findOrCreateSuperAdmin() {
  console.log('Searching database for Super Admin users...');

  const { data: dbUsers, error } = await adminClient
    .from('users')
    .select('id, name, email, role, tenant_id, tenants(subdomain, name)')
    .or('role.eq.owner,role.eq.super_admin,role.eq.admin');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('Matching Super Admin / Admin candidate users in DB:');
  console.table(dbUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    tenant: u.tenants ? u.tenants.subdomain : u.tenant_id,
  })));

  // Setup / Ensure super admin credentials from environment
  const envAdmins = process.env.PLATFORM_ADMIN_EMAILS;
  if (!envAdmins) {
    console.warn('PLATFORM_ADMIN_EMAILS is not set. No super admin accounts will be created.');
    console.warn('Set PLATFORM_ADMIN_EMAILS=admin@example.com,superadmin@example.com in .env');
    return;
  }

  const superAdminEmails = envAdmins.split(',').map(e => e.trim()).filter(Boolean);

  const credentials = [];

  for (const email of superAdminEmails) {
    const { data: authData } = await adminClient.auth.admin.listUsers();
    let authUser = authData?.users?.find(u => u.email === email);

    const password = generateSecurePassword();

    if (!authUser) {
      console.log(`Creating Super Admin Auth account for: ${email}`);
      const { data: created, error: cErr } = await adminClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        app_metadata: { is_platform_admin: true },
      });
      if (!cErr && created.user) {
        authUser = created.user;
        credentials.push({ email, password, action: 'CREATED' });
      }
    } else {
      console.log(`Updating password for Super Admin: ${email}`);
      await adminClient.auth.admin.updateUserById(authUser.id, {
        password: password,
        email_confirm: true,
        app_metadata: { is_platform_admin: true },
      });
      credentials.push({ email, password, action: 'UPDATED' });
    }

    if (authUser) {
      // Ensure user exists in users table with admin role
      const { data: tenant } = await adminClient.from('tenants').select('id').eq('subdomain', 'meridian').single();
      if (tenant) {
        await adminClient.from('users').upsert({
          id: authUser.id,
          email: email,
          name: 'SigmaGo Platform Admin',
          role: 'admin',
          tenant_id: tenant.id,
          status: 'active',
        }, { onConflict: 'id' });
      }
    }
  }

  console.log('\n--- SUPER ADMIN CREDENTIALS (SAVE THESE, SHOWN ONLY ONCE) ---');
  console.table(credentials);
  console.log('\n⚠️  These passwords are cryptographically generated and will NOT be shown again.');
  console.log('   Store them securely in a password manager.');
}

findOrCreateSuperAdmin();
