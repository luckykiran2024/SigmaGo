import { adminClient } from '@/lib/supabase/admin';
import GrantManager from './GrantManager';

import Link from 'next/link';

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
      <div className="border-b border-[#E4E7EC] pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold text-[#101828] tracking-tight">
            Organizational Intelligence Access & Grant Register
          </h1>
          <p className="text-[14px] text-[#667085] mt-0.5">
            Decoupled Access Control: Admin/Owner defines for whom intelligence access is granted. Roles carry no inherent visibility.
          </p>
        </div>

        <Link
          href={`/${resolvedParams.tenant}/intelligence`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#274C77] hover:bg-[#1E3C60] text-white text-xs font-bold shadow-xs transition shrink-0"
        >
          <span>View Decision Analytics Dashboard →</span>
        </Link>
      </div>

      <GrantManager
        grants={grants || []}
        tenantId={tenant.id}
        adminUserId={adminUser?.id || ''}
      />
    </div>
  );
}
