import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import Link from 'next/link';
import { ShieldCheck, Key, ShieldAlert, BarChart3, FileText, CheckCircle2, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UserIntelligencePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve tenant
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) return <div className="p-8 text-center text-red-600 font-bold">Tenant not found</div>;

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) redirect('/login');

  // Strict Tenant Isolation Enforcement (§ P0 Security Review)
  if (profile.tenant_id !== tenant.id) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-[#E4E7EC] rounded-[8px] shadow-none text-center space-y-3 font-sans">
        <Lock className="w-8 h-8 text-[#B42318] mx-auto" />
        <h2 className="text-[16px] font-semibold text-[#182230]">Cross-tenant access forbidden</h2>
        <p className="text-[13px] text-[#475467] leading-relaxed">
          Your authenticated user does not belong to workspace &quot;{tenant.name}&quot;.
        </p>
      </div>
    );
  }

  const userEmail = (profile.email || user.email || '').toLowerCase().trim();
  const isAdmin = profile.role === 'admin' || profile.role === 'owner';

  // Check explicit intelligence grant (§ Build Prompt #17)
  const { data: activeGrant } = await adminClient
    .from('intelligence_grants')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('email', userEmail)
    .is('revoked_at', null)
    .maybeSingle();

  if (!activeGrant && !isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-[#E4E7EC] rounded-[8px] shadow-none text-center space-y-3 font-sans">
        <Lock className="w-8 h-8 text-[#B42318] mx-auto" />
        <h2 className="text-[16px] font-semibold text-[#182230]">Intelligence access required</h2>
        <p className="text-[13px] text-[#475467] leading-relaxed">
          Access to organizational decision metrics is an explicit grant issued to normalized email addresses. Roles carry no inherent intelligence access.
        </p>
        <p className="text-[13px] font-medium text-[#182230]">
          Contact your workspace administrator to request an explicit intelligence grant for <span className="font-mono text-[#274C77]">{userEmail}</span>.
        </p>
      </div>
    );
  }

  // Update audit access log if user accessed via explicit grant
  if (activeGrant) {
    await adminClient
      .from('intelligence_grants')
      .update({
        access_count: (activeGrant.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', activeGrant.id);
  }

  const grantScope = activeGrant ? activeGrant.scope : 'FULL';

  // Resolve current period and comparable baseline (Same quarter prior year)
  const { resolvePeriodKey, getPeriodDateRange } = await import('@/lib/intelligence/analytics/periods');
  const { calculateStepDistribution } = await import('@/lib/intelligence/analytics/distributions');
  const { analyzeStepMovement } = await import('@/lib/intelligence/analytics/contributors');
  const { generateIntelligenceSignals } = await import('@/lib/intelligence/analytics/signals');
  const ExecutiveIntelligenceConsole = (await import('@/components/intelligence/ExecutiveIntelligenceConsole')).default;

  const periodInfo = resolvePeriodKey();
  const comparatorRange = getPeriodDateRange(periodInfo.comparatorPeriodKey);

  // Query requests for intelligence analytics
  const { data: allRequests } = await adminClient
    .from('approval_requests')
    .select('id, ref, subject, status, resolved_step_type, baseline_step_type, blast_at_seal, created_at, finalized_at, workflow_id, category_id, categories(name, domain)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  // Separate active current requests and historical comparator requests
  const currentRequests = (allRequests || []).filter((r: any) => {
    const created = new Date(r.created_at).getTime();
    return created >= new Date(periodInfo.startDate).getTime() && created <= new Date(periodInfo.endDate).getTime();
  });
  const activeCurrentRequests = currentRequests.length > 0 ? currentRequests : (allRequests || []);

  const comparatorRequests = (allRequests || []).filter((r: any) => {
    const created = new Date(r.created_at).getTime();
    return created >= new Date(comparatorRange.startDate).getTime() && created <= new Date(comparatorRange.endDate).getTime();
  });

  const currentCounts = {
    STRUCTURAL: 0,
    TRANSACTIONAL: 0,
    EXCEPTION: 0,
    PROCESS: 0,
  };

  activeCurrentRequests.forEach((row: any) => {
    const st = (row.resolved_step_type || row.baseline_step_type || 'TRANSACTIONAL') as any;
    if (currentCounts[st as keyof typeof currentCounts] !== undefined) {
      currentCounts[st as keyof typeof currentCounts]++;
    } else {
      currentCounts.TRANSACTIONAL++;
    }
  });

  // Ensure non-zero total for display
  if (Object.values(currentCounts).reduce((a, b) => a + b, 0) === 0) {
    currentCounts.TRANSACTIONAL = 1;
  }

  // Baseline comparator counts: Real observed counts from the prior-year comparable period
  const comparatorCounts = {
    STRUCTURAL: 0,
    TRANSACTIONAL: 0,
    EXCEPTION: 0,
    PROCESS: 0,
  };

  comparatorRequests.forEach((row: any) => {
    const st = (row.resolved_step_type || row.baseline_step_type || 'TRANSACTIONAL') as any;
    if (comparatorCounts[st as keyof typeof comparatorCounts] !== undefined) {
      comparatorCounts[st as keyof typeof comparatorCounts]++;
    } else {
      comparatorCounts.TRANSACTIONAL++;
    }
  });

  const distribution = calculateStepDistribution(currentCounts, comparatorCounts);

  // Fetch active workflows
  const { data: workflows } = await adminClient
    .from('workflows')
    .select('id, name, category_id, base_step_type, categories(domain)')
    .eq('tenant_id', tenant.id);

  // Build movement analyses for each STEP type
  const movementAnalyses: any = {};
  const stepKeys: Array<'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS'> = [
    'STRUCTURAL',
    'TRANSACTIONAL',
    'EXCEPTION',
    'PROCESS',
  ];

  for (const st of stepKeys) {
    const stWorkflows = (workflows || []).filter((w: any) => (w.base_step_type || 'TRANSACTIONAL') === st);

    let allocatedCurrent = 0;
    let allocatedBaseline = 0;

    const matchingWorkflows = stWorkflows.map((w: any) => {
      const cCount = activeCurrentRequests.filter((r: any) =>
        (r.workflow_id === w.id || r.category_id === w.category_id) &&
        (r.resolved_step_type || r.baseline_step_type || 'TRANSACTIONAL') === st
      ).length;

      const bCount = comparatorRequests.filter((r: any) =>
        (r.workflow_id === w.id || r.category_id === w.category_id) &&
        (r.resolved_step_type || r.baseline_step_type || 'TRANSACTIONAL') === st
      ).length;

      allocatedCurrent += cCount;
      allocatedBaseline += bCount;

      return {
        workflowId: w.id,
        workflowName: w.name,
        domain: w.categories?.domain || 'OPERATIONS',
        currentCount: cCount,
        baselineCount: bCount,
      };
    });

    const unallocatedCurrent = Math.max(0, currentCounts[st] - allocatedCurrent);
    const unallocatedBaseline = Math.max(0, comparatorCounts[st] - allocatedBaseline);

    if (unallocatedCurrent > 0 || unallocatedBaseline > 0 || matchingWorkflows.length === 0) {
      matchingWorkflows.push({
        workflowId: `wf-default-${st}`,
        workflowName: matchingWorkflows.length === 0 ? `Standard ${st} Decisions` : `Other ${st} Decisions`,
        domain: 'GENERAL',
        currentCount: unallocatedCurrent,
        baselineCount: unallocatedBaseline,
      });
    }

    const consequentialDecisions = (allRequests || [])
      .filter((r: any) => (r.resolved_step_type || r.baseline_step_type || 'TRANSACTIONAL') === st)
      .map((r: any) => ({
        requestId: r.id,
        ref: r.ref,
        subject: r.subject,
        stepType: st,
        directDescendants: r.blast_at_seal || 0,
        transitiveDescendants: r.blast_at_seal || 0,
        basedOnCount: 1,
        exceptionCount: st === 'EXCEPTION' ? 1 : 0,
        footprintScore: (r.blast_at_seal || 0) * 10 + 20,
        classification: ((r.blast_at_seal || 0) > 5 ? 'STABLE_FOUNDATION' : 'EMERGING') as 'STABLE_FOUNDATION' | 'EMERGING',
        whySurfaced: 'High organizational reliance and downstream blast radius',
      }));

    movementAnalyses[st] = analyzeStepMovement({
      stepType: st,
      currentShare: distribution.steps[st].currentShare,
      comparatorShare: distribution.steps[st].comparatorShare,
      movementPp: distribution.steps[st].movementPp,
      totalCurrentAll: distribution.totalCurrentDecisions,
      totalBaselineAll: distribution.totalComparatorDecisions,
      workflowData: matchingWorkflows,
      consequentialDecisions,
    });
  }

  // Query tenant policies to generate dynamic exception pressure signals
  const { data: tenantPolicies } = await adminClient
    .from('policies')
    .select('id, title')
    .eq('tenant_id', tenant.id);

  const dynamicExceptionSignals = (tenantPolicies || []).map((pol: any) => {
    const curPolRequests = activeCurrentRequests.filter((r: any) =>
      r.categories?.governing_policy_id === pol.id || (r.categories?.domain && r.categories.domain.toLowerCase() === pol.title.toLowerCase())
    );
    const compPolRequests = comparatorRequests.filter((r: any) =>
      r.categories?.governing_policy_id === pol.id || (r.categories?.domain && r.categories.domain.toLowerCase() === pol.title.toLowerCase())
    );

    const curExceptions = curPolRequests.filter((r: any) => (r.resolved_step_type || r.baseline_step_type) === 'EXCEPTION').length;
    const compExceptions = compPolRequests.filter((r: any) => (r.resolved_step_type || r.baseline_step_type) === 'EXCEPTION').length;

    const currentRate = curPolRequests.length > 0 ? curExceptions / curPolRequests.length : 0;
    const historicalBaselineRate = compPolRequests.length > 0 ? compExceptions / compPolRequests.length : 0;

    return {
      policyId: pol.id,
      policyTitle: pol.title,
      totalDecisions: curPolRequests.length,
      exceptionCount: curExceptions,
      currentRate,
      historicalBaselineRate,
    };
  }).filter((s: any) => s.totalDecisions >= 5);

  const topExceptionWf = movementAnalyses['EXCEPTION']?.contributors[0]?.workflowName || 'General Exception Approvals';
  const topStructuralWf = movementAnalyses['STRUCTURAL']?.contributors[0]?.workflowName || 'Organizational Governance Decisions';

  // Generate 4-layer signals from dynamic data
  const signals = generateIntelligenceSignals({
    exceptionSignals: dynamicExceptionSignals,
    stepMovements: [
      {
        stepType: 'EXCEPTION',
        movementPp: distribution.steps.EXCEPTION.movementPp,
        currentShare: distribution.steps.EXCEPTION.currentShare,
        baselineShare: distribution.steps.EXCEPTION.comparatorShare,
        topWorkflowName: topExceptionWf,
        sampleSize: distribution.totalCurrentDecisions,
        comparablePeriodsCount: distribution.totalComparatorDecisions > 0 ? 2 : 1,
        policyCoverage: 1.0,
      },
      {
        stepType: 'STRUCTURAL',
        movementPp: distribution.steps.STRUCTURAL.movementPp,
        currentShare: distribution.steps.STRUCTURAL.currentShare,
        baselineShare: distribution.steps.STRUCTURAL.comparatorShare,
        topWorkflowName: topStructuralWf,
        sampleSize: distribution.totalCurrentDecisions,
        comparablePeriodsCount: distribution.totalComparatorDecisions > 0 ? 2 : 1,
        policyCoverage: 1.0,
      },
    ],
  });

  // Strict Server-Side Privacy Isolation (§ P0 Security Review)
  // If user grant is AGGREGATE_ONLY, strip all row-level decision records at the data boundary
  const isAggregateOnly = grantScope === 'AGGREGATE_ONLY';
  if (isAggregateOnly) {
    stepKeys.forEach((st) => {
      if (movementAnalyses[st]) {
        movementAnalyses[st].topConsequentialDecisions = [];
      }
    });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-6 font-sans">
      <ExecutiveIntelligenceConsole
        tenant={resolvedParams.tenant}
        userEmail={userEmail}
        grantScope={grantScope}
        isAdmin={isAdmin}
        distribution={distribution}
        periodDisplayName={periodInfo.displayName}
        comparatorDisplayName={`${periodInfo.quarter} ${periodInfo.year - 1}`}
        signals={signals}
        movementAnalyses={movementAnalyses}
        sealedDecisions={isAggregateOnly ? [] : (allRequests || [])}
      />
    </div>
  );
}
