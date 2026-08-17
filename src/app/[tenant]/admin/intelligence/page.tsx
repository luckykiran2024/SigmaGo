import { adminClient } from '@/lib/supabase/admin';
import GrantManager from './GrantManager';

export default async function AdminIntelligencePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;

  // Resolve tenant info
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) {
    return <div className="p-8 text-center text-red-600 font-bold">Tenant not found.</div>;
  }

  // Fetch current intelligence grants for this tenant
  const { data: grants } = await adminClient
    .from('intelligence_grants')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('granted_at', { ascending: false });

  // Get admin user ID for audit trailing (first admin user)
  const { data: adminUser } = await adminClient
    .from('users')
    .select('id')
    .eq('tenant_id', tenant.id)
    .limit(1)
    .single();

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-sans font-extrabold tracking-tight text-ink">
          Organizational Intelligence Access
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Decoupled Access Control: Intelligence access is an explicit, audited grant issued to normalized email addresses. Admin and HR roles do not confer intelligence visibility.
        </p>
      </div>

      <GrantManager
        grants={grants || []}
        tenantId={tenant.id}
        adminUserId={adminUser?.id || ''}
      />
    </div>
  );
}
