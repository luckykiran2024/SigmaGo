import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getProfileForAuthUser } from '@/lib/db/users';
import Navbar from '@/components/ui/Navbar';
import MetricStrip from '@/components/ui/MetricStrip';
import DwellRequestCard from '@/components/ui/DwellRequestCard';
import RecentlySealedPanel from '@/components/ui/RecentlySealedPanel';
import { getInlineExceptionCount } from '@/lib/db/intelligence';

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

  // 2. Fetch pending approval steps for user
  const { data: pendingSteps } = await adminClient
    .from('approval_steps')
    .select(`
      id,
      request_id,
      order_index,
      entered_at,
      status,
      approval_requests (
        id,
        ref,
        subject,
        category_id,
        owner_id,
        created_at,
        users!owner_id (name, department),
        categories (name, step_type)
      )
    `)
    .eq('approver_id', publicUser?.id)
    .eq('status', 'pending')
    .order('entered_at', { ascending: true });

  // Deduplicate requests
  const pendingCards: any[] = [];
  const seenReqIds = new Set<string>();

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
          exceptionSummary = await getInlineExceptionCount(tenantId, req.category_id);
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
          currentStageIndex: step.order_index || 0,
          totalStages: 3,
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

  // 4. Fetch Recently Sealed Decisions
  const { data: sealedDecisions } = await adminClient
    .from('approval_requests')
    .select('id, ref, subject, finalized_at, checksum_sha256')
    .eq('tenant_id', tenantId)
    .not('finalized_at', 'is', null)
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
    oldestWaitingDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-8 space-y-8 font-sans">
        {/* Application-Scale Page Heading (23px/700) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[23px] font-bold text-[#101828] tracking-tight">
              Dashboard
            </h1>
            <p className="text-[14px] text-[#667085] mt-0.5">
              Welcome back, <strong className="text-[#101828]">{userName}</strong>. Active decisions requiring your authority.
            </p>
          </div>
        </div>

        {/* 4-Card Metric Strip */}
        <MetricStrip
          tenantSubdomain={resolvedParams.tenant}
          needsApprovalCount={pendingCards.length}
          oldestWaitingDays={oldestWaitingDays}
          inFlightCount={mySubmissions?.length || 0}
          atFinalStageCount={1}
          sealedThisMonthCount={sealedItems.length}
          sealedIncreaseVsLastMonth={2}
          policiesDriftingCount={1}
          driftingPolicyNames={['Increment Cap', 'Capex Limit']}
        />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left 2 Columns: Requests Needing Your Authority */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#101828] tracking-tight">
                Needs Your Approval ({pendingCards.length})
              </h2>
            </div>

            {pendingCards.length === 0 ? (
              <div className="p-8 bg-white border border-[#E4E7EC] rounded-[8px] text-center text-[14px] text-[#667085]">
                Nothing waiting on you. All decision queues are clear!
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
            {/* Recently Sealed Panel (The only Gold surface) */}
            <RecentlySealedPanel
              tenantSubdomain={resolvedParams.tenant}
              sealedDecisions={sealedItems}
            />

            {/* In Flight Submissions */}
            <div className="p-5 bg-white border border-[#E4E7EC] rounded-[8px] space-y-3">
              <h3 className="text-[14.5px] font-semibold text-[#101828]">
                Your Submissions in Flight
              </h3>
              {(!mySubmissions || mySubmissions.length === 0) ? (
                <p className="text-xs text-[#667085]">You have no open requests in flight.</p>
              ) : (
                <div className="space-y-2">
                  {mySubmissions.map((sub) => (
                    <div key={sub.id} className="p-3 bg-[#F9FAFB] rounded-[6px] border border-[#E4E7EC] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#101828] truncate">{sub.subject}</span>
                        <span className="font-mono text-[11px] text-[#667085]">{sub.ref || 'REQ-001'}</span>
                      </div>
                      <div className="text-[11.5px] text-[#667085]">
                        ⏱ With <strong className="text-[#101828]">Arjun Bose</strong> for 2 days
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}