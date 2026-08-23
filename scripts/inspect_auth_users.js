import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(url, key);

async function inspectAndSetupUsers() {
  console.log('--- SUPABASE AUTH USERS ---');
  const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers();
  if (authErr) {
    console.error('Error listing auth users:', authErr);
    return;
  }

  const authUsers = authData.users;
  console.log(`Found ${authUsers.length} users in Supabase Auth.`);
  authUsers.forEach(u => {
    console.log(`- Email: ${u.email} | ID: ${u.id}`);
  });

  console.log('\n--- PUBLIC USERS IN DB ---');
  const { data: dbUsers, error: dbErr } = await adminClient
    .from('users')
    .select('id, name, email, role, tenant_id, tenants(subdomain, name)')
    .order('email');

  if (dbErr) {
    console.error('Error fetching DB users:', dbErr);
    return;
  }

  console.table(dbUsers.map(u => ({
    name: u.name,
    email: u.email,
    role: u.role,
    tenant: u.tenants ? u.tenants.subdomain : u.tenant_id,
  })));
}

inspectAndSetupUsers();
