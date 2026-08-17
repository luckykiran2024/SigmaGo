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
    <div className="max-w-[1240px] mx-auto px-4 py-8 space-y-8 font-sans">
      <div className="border-b border-[#E4E7EC] pb-6">
        <h1 className="text-[23px] font-bold text-[#101828] tracking-tight">
          Organizational Intelligence Access
        </h1>
        <p className="text-[14px] text-[#667085] mt-0.5">
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
