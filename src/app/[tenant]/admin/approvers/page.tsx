import { adminClient } from '@/lib/supabase/admin';
import ApproverRegisterManager from './ApproverRegisterManager';

export default async function AdminApproversPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;

  // 1. Resolve tenant
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) {
    return <div className="p-8 text-center text-red-600 font-bold">Tenant not found.</div>;
  }

  // 2. Fetch Directory Persons (excluding service accounts & inactive)
  const { data: directoryPeople } = await adminClient
    .from('directory_persons')
    .select('id, email, full_name, job_title, department')
    .eq('tenant_id', tenant.id)
    .eq('status', 'ACTIVE')
    .eq('is_service_account', false);

  // 3. Fetch Approvers
  const { data: rawApprovers } = await adminClient
    .from('approvers')
    .select(`
      id, email, added_at, removed_at, note,
      approver_authorities (
        stage,
        categories (name)
      )
    `)
    .eq('tenant_id', tenant.id)
    .order('added_at', { ascending: false });

  // Map approver items with directory names & authorities
  const approversList = (rawApprovers || []).map((app: any) => {
    const person = (directoryPeople || []).find((p) => p.email === app.email);
    const authorities = (app.approver_authorities || []).map((auth: any) => ({
      categoryName: auth.categories?.name || 'Category',
      stage: auth.stage,
    }));

    return {
      id: app.id,
      email: app.email,
      fullName: person?.full_name || app.email,
      jobTitle: person?.job_title,
      department: person?.department,
      addedAt: app.added_at,
      removedAt: app.removed_at,
      note: app.note,
      authorities,
    };
  });

  // 4. Check for unstaffed category stages
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name, default_chain')
    .eq('tenant_id', tenant.id);

  const unstaffedCategories: Array<{ categoryName: string; unstaffedStages: number[] }> = [];

  (categories || []).forEach((cat: any) => {
    const chain = cat.default_chain || [];
    if (Array.isArray(chain)) {
      const unstaffed: number[] = [];
      chain.forEach((_, idx) => {
        const stageNum = idx + 1;
        const hasApprover = approversList.some(
          (a) => !a.removedAt && a.authorities.some((auth: { categoryName: string; stage: number }) => auth.categoryName === cat.name && auth.stage === stageNum)
        );
        if (!hasApprover) {
          unstaffed.push(stageNum);
        }
      });
      if (unstaffed.length > 0) {
        unstaffedCategories.push({ categoryName: cat.name, unstaffedStages: unstaffed });
      }
    }
  });

  // Get admin user ID
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
          Approver Register
        </h1>
        <p className="text-[14px] text-[#667085] mt-0.5">
          Curated register of who holds authority to approve decisions in this organization. Authority is assigned by category and stage.
        </p>
      </div>

      <ApproverRegisterManager
        approvers={approversList}
        unstaffedCategories={unstaffedCategories}
        directoryPeople={directoryPeople || []}
        tenantId={tenant.id}
        adminUserId={adminUser?.id || ''}
      />
    </div>
  );
}
