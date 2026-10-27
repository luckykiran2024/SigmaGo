import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import MetricStrip from '@/components/ui/MetricStrip';
import DwellRequestCard from '@/components/ui/DwellRequestCard';
import RecentlySealedPanel from '@/components/ui/RecentlySealedPanel';
import { getInlineExceptionCount } from '@/lib/db/intelligence';
import { Inbox, ArrowRight } from 'lucide-react';

export default async function TenantDashboard({ params }: { params: Promise<{ tenant: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // 1. Run tenant lookup and getUser concurrently
  const [authUserRes, tenantRes] = await Promise.all([
    supabase.auth.getUser(),
    adminClient
      .from('tenants')
      .select('id, name')
      .eq('subdomain', resolvedParams.tenant)
      .single(),
  ]);

  const user = authUserRes.data.user;
  const tenantData = tenantRes.data;

  if (!user || !tenantData) redirect('/login');
  const tenantId = tenantData.id;

  const publicUser = await getProfileForAuthUser(user.id, user.email || '');
  const userName = publicUser?.name || user.email?.split('@')[0] || 'Member';

  // 2. Fetch pending approval steps for user strictly within this tenant
  const { data: pendingSteps } = await adminClient
    .from('approval_steps')
    .select(`
      id,
      request_id,
      order_index,
      stage_index,
      entered_at,
      status,
      approval_requests!inner (
        id,
        ref,
        subject,
        category_id,
        owner_id,
        tenant_id,
        created_at,
        users!owner_id (name, department),
        categories (name, step_type)
      )
    `)
    .eq('approver_id', publicUser?.id)
    .eq('status', 'pending')
    .eq('approval_requests.tenant_id', tenantId)
    .order('entered_at', { ascending: true });

  // Deduplicate requests
  const pendingCards: any[] = [];
  const seenReqIds = new Set<string>();
  const pendingRequestIds = [...new Set((pendingSteps || []).map((step) => step.request_id))];
  const { data: routeSteps } = pendingRequestIds.length
    ? await adminClient.from('approval_steps').select('request_id, stage_index').in('request_id', pendingRequestIds)
    : { data: [] };
  const stageCountByRequest = new Map<string, number>();
  for (const routeStep of routeSteps || []) {
    stageCountByRequest.set(routeStep.request_id, Math.max(stageCountByRequest.get(routeStep.request_id) || 0, (routeStep.stage_index ?? 0) + 1));
  }

  if (pendingSteps) {
    for (const step of pendingSteps) {
      const req = Array.isArray(step.approval_requests) ? step.approval_requests[0] : step.approval_requests;
      if (req && !seenReqIds.has(req.id)) {
        seenReqIds.add(req.id);
        const owner = Array.isArray(req.users) ? req.users[0] : req.users;
        const category = Array.isArray(req.categories) ? req.categories[0] : req.categories;

        // Fetch inline exception summary if EXCEPTION category
        let exceptionSummary = null;
        if (category?.step_type === 'EXCEPTION' || category?.name?.toLowerCase().includes('exception')) {
          exceptionSummary = await getInlineExceptionCount(tenantId, req.id);
        }

        pendingCards.push({
          stepId: step.id,
          requestId: req.id,
          refCode: req.ref || `REQ-${req.id.slice(0, 8)}`,
          subject: req.subject,
          requesterName: owner?.name || 'Staff Member',
          department: owner?.department || 'Operations',
          stepType: (category?.step_type as any) || 'TRANSACTIONAL',
          enteredAt: step.entered_at || req.created_at,
          currentStageIndex: step.stage_index ?? 0,
          totalStages: stageCountByRequest.get(req.id) || 1,
          exceptionSummary,
        });
      }
    }
  }

  // 3. Fetch My Submissions in flight
  const { data: mySubmissions } = await adminClient
    .from('approval_requests')
    .select('id, ref, subject, status, created_at')
    .eq('tenant_id', tenantId)
    .eq('owner_id', publicUser?.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // 4. Fetch current-month finalized decisions and certificate coverage.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const [{ count: approvedThisMonth }, { count: sealedThisMonth }, { count: finalizingThisMonth }] = await Promise.all([
    adminClient.from('approval_requests').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'approved').gte('finalized_at', monthStart).lt('finalized_at', nextMonthStart),
    adminClient.from('approval_requests').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).gte('finalized_at', monthStart).lt('finalized_at', nextMonthStart)
      .not('checksum_sha256', 'is', null),
    adminClient.from('approval_requests').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'FINALIZING').gte('created_at', monthStart).lt('created_at', nextMonthStart),
  ]);
  const { data: sealedDecisions } = await adminClient
    .from('approval_requests')
    .select('id, ref, subject, finalized_at, checksum_sha256')
    .eq('tenant_id', tenantId)
    .gte('finalized_at', monthStart)
    .lt('finalized_at', nextMonthStart)
    .not('checksum_sha256', 'is', null)
    .order('finalized_at', { ascending: false })
    .limit(5);

  const sealedItems = (sealedDecisions || []).map((d) => ({
    id: d.id,
    refCode: d.ref || `REQ-${d.id.slice(0, 8)}`,
    subject: d.subject,
    finalizedAt: d.finalized_at,
    checksum: d.checksum_sha256 || '',
  }));

  // Oldest waiting days calculation
  let oldestWaitingDays = 0;
  if (pendingCards.length > 0 && pendingCards[0].enteredAt) {
    const diffMs = new Date().getTime() - new Date(pendingCards[0].enteredAt).getTime();
    oldestWaitingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8 font-sans">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE5EA] pb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-[#182B3D] tracking-tight">
            Decision Intelligence
          </h1>
          <p className="text-[14px] text-[#526679] mt-1">
            Welcome back, <strong className="text-[#182B3D] font-semibold">{userName}</strong>. Active decisions requiring your organizational authority.
          </p>
        </div>
      </div>

      {/* 4-Card Executive Metric Strip */}
      <MetricStrip
        tenantSubdomain={resolvedParams.tenant}
        needsApprovalCount={pendingCards.length}
        oldestWaitingDays={oldestWaitingDays}
        inFlightCount={mySubmissions?.length || 0}
        sealedThisMonthCount={sealedThisMonth || 0}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Requests Needing Your Authority */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[#182B3D] tracking-tight">
              Needs Your Approval ({pendingCards.length})
            </h2>
            {pendingCards.length > 0 && (
              <Link
                href={`/${resolvedParams.tenant}/approvals`}
                className="text-[13px] font-medium text-[#0B7780] hover:text-[#17324D] flex items-center gap-1 transition-colors"
              >
                View all in approvals
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {pendingCards.length === 0 ? (
            <div className="p-10 bg-white border border-[#DCE5EA] rounded-[10px] text-center space-y-2 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#ECF6F5] text-[#0B7780] flex items-center justify-center mx-auto">
                <Inbox className="w-5 h-5" />
              </div>
              <h3 className="text-[14.5px] font-semibold text-[#182B3D]">All decision queues are clear</h3>
              <p className="text-[13px] text-[#526679] max-w-md mx-auto">
                No decisions are currently awaiting your authority. Once requests enter your approval stage, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCards.map((card) => (
                <DwellRequestCard
                  key={card.requestId}
                  tenantSubdomain={resolvedParams.tenant}
                  requestId={card.requestId}
                  refCode={card.refCode}
                  subject={card.subject}
                  requesterName={card.requesterName}
                  department={card.department}
                  stepType={card.stepType}
                  enteredAt={card.enteredAt}
                  currentStageIndex={card.currentStageIndex}
                  totalStages={card.totalStages}
                  exceptionSummary={card.exceptionSummary}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Column: Recently Sealed Panel & Submissions in Flight */}
        <div className="space-y-6">
          {/* Recently Sealed Panel */}
          <RecentlySealedPanel
            tenantSubdomain={resolvedParams.tenant}
            sealedDecisions={sealedItems}
            sealedRateText={`${sealedThisMonth || 0} of ${approvedThisMonth || 0} approved decisions sealed this month.${finalizingThisMonth ? ` ${finalizingThisMonth} request${finalizingThisMonth === 1 ? '' : 's'} awaiting a seal.` : ''}`}
          />

          {/* In Flight Submissions */}
          <div className="p-5 bg-white border border-[#DCE5EA] rounded-[10px] space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAF0F2]">
              <h3 className="text-[14.5px] font-semibold text-[#182B3D]">
                Your Submissions in Flight
              </h3>
              <span className="text-[12px] font-semibold text-[#526679] px-2 py-0.5 rounded-[4px] bg-[#EEF2F4]">
                {mySubmissions?.length || 0}
              </span>
            </div>

            {(!mySubmissions || mySubmissions.length === 0) ? (
              <p className="text-[13px] text-[#637587] py-2">You have no open requests in flight.</p>
            ) : (
              <div className="space-y-2.5">
                {mySubmissions.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/${resolvedParams.tenant}/requests/${sub.id}`}
                    className="block p-3 bg-[#F6F8F9] hover:bg-[#ECF6F5] rounded-[6px] border border-[#EAF0F2] hover:border-[#D7ECEA] space-y-1 transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#182B3D] group-hover:text-[#17324D] truncate">
                        {sub.subject}
                      </span>
                      <span className="font-mono text-[11px] text-[#637587] shrink-0 ml-2">
                        {sub.ref || 'REQ-001'}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#526679] flex items-center justify-between">
                      <span>Status: <strong className="text-[#17324D] font-medium uppercase">{sub.status}</strong></span>
                      <span className="text-[#637587]">
                        {new Date(sub.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

