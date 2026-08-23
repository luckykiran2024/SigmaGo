import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(url, key);

async function findOrCreateSuperAdmin() {
  console.log('Searching database for Super Admin users...');

  const { data: dbUsers, error } = await adminClient
    .from('users')
    .select('id, name, email, role, tenant_id, tenants(subdomain, name)')
    .or('role.eq.owner,role.eq.super_admin,role.eq.admin,email.ilike.%sigmago%');

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

  // Setup / Ensure super admin credentials
  const superAdminEmails = [
    'admin@sigmago.com',
    'superadmin@sigmago.com',
    'sigmago596+mrd@gmail.com',
  ];

  for (const email of superAdminEmails) {
    const { data: authData } = await adminClient.auth.admin.listUsers();
    let authUser = authData?.users?.find(u => u.email === email);

    if (!authUser) {
      console.log(`Creating Super Admin Auth account for: ${email}`);
      const { data: created, error: cErr } = await adminClient.auth.admin.createUser({
        email: email,
        password: 'Password@123',
        email_confirm: true,
      });
      if (!cErr && created.user) {
        authUser = created.user;
      }
    } else {
      console.log(`Updating password for Super Admin: ${email}`);
      await adminClient.auth.admin.updateUserById(authUser.id, {
        password: 'Password@123',
        email_confirm: true,
      });
    }

    if (authUser) {
      // Ensure user exists in users table with admin role
      const { data: tenant } = await adminClient.from('tenants').select('id').eq('subdomain', 'meridian').single();
      if (tenant) {
        await adminClient.from('users').upsert({
          id: authUser.id,
          email: email,
          name: email.startsWith('admin') ? 'SigmaGo Super Admin' : 'Meridian Admin',
          role: 'admin',
          tenant_id: tenant.id,
          status: 'active',
        }, { onConflict: 'id' });
      }
    }
  }

  console.log('\n--- SUPER ADMIN CREDENTIALS READY ---');
}

findOrCreateSuperAdmin();
