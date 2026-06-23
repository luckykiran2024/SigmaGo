import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import { getWorkflows } from '@/lib/db/workflows';
import WorkflowsConsole from './WorkflowsConsole';

export default async function AdminWorkflowsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant ID
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) redirect('/login');

  // Verify Role is Admin
  const profile = await getProfileForAuthUser(user.id, user.email || '');

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin' && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    redirect(`/${resolvedParams.tenant}`);
  }

  // Load categories
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .order('name', { ascending: true });

  // Load active users
  const { data: activeUsers } = await adminClient
    .from('users')
    .select('id, name, email, designation, employee_id')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  // Load workflows
  const workflows = await getWorkflows(tenant.id);

  return (
    <div className="space-y-6 font-body">
      <div className="md:flex md:items-center md:justify-between border-b border-gray-100 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
            Approval Workflows
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Define standardized approval templates and link them to categories. Enforce lock policies on standard paths.
          </p>
        </div>
      </div>

      <WorkflowsConsole
        tenantSubdomain={resolvedParams.tenant}
        categories={categories || []}
        activeUsers={activeUsers || []}
        initialWorkflows={workflows as any || []}
      />
    </div>
  );
}
