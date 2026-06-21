import { adminClient } from '@/lib/supabase/admin';
import OrgAdminConsole from './OrgAdminConsole';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function OrgAdminPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant ID & Secret
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, hrms_sync_secret')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) redirect('/login');

  // Verify Role is Admin
  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    redirect(`/${resolvedParams.tenant}`);
  }

  // Load active and inactive users in tenant
  const { data: users } = await adminClient
    .from('users')
    .select('id, employee_id, name, email, status, designation, career_level, department, manager_employee_id')
    .eq('tenant_id', tenant.id)
    .order('name', { ascending: true });

  // Load org_nodes
  const { data: orgNodes } = await adminClient
    .from('org_nodes')
    .select('id, user_id, parent_id, title')
    .eq('tenant_id', tenant.id);

  // Load sync logs
  const { data: logs } = await adminClient
    .from('hrms_sync_log')
    .select('id, source, changes, applied_at')
    .eq('tenant_id', tenant.id)
    .order('applied_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6 font-body">
      <div className="md:flex md:items-center md:justify-between border-b border-gray-100 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
            Organization Console
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Ingest reporting hierarchy, configure HRMS webhooks, and view the organization tree.
          </p>
        </div>
      </div>

      <OrgAdminConsole 
        tenantSubdomain={resolvedParams.tenant}
        initialUsers={users || []}
        initialOrgNodes={orgNodes || []}
        initialSecret={tenant.hrms_sync_secret}
        initialSyncLogs={logs || []}
      />
    </div>
  );
}
