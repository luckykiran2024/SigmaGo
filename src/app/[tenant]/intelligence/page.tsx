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
    .select('id, ref, subject, status, resolved_step_type, baseline_step_type, blast_at_seal, created_at, finalized_at, workflow_id, category_id, categories(name, domain, governing_policy_id)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  // Filter requests strictly to selected period (no synthetic fallback to allRequests)
  const currentRequests = (allRequests || []).filter((r: any) => {
    const created = new Date(r.created_at).getTime();
    return created >= new Date(periodInfo.startDate).getTime() && created <= new Date(periodInfo.endDate).getTime();
  });

  const comparatorRequests = (allRequests || []).filter((r: any) => {
    const created = new Date(r.created_at).getTime();
    return created >= new Date(comparatorRange.startDate).getTime() && created <= new Date(comparatorRange.endDate).getTime();
  });

  const VALID_STEPS = new Set(['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS']);
  const getCleanStepType = (row: any): import('@/lib/intelligence/analytics/distributions').StepType | null => {
    if (row.resolved_step_type && VALID_STEPS.has(row.resolved_step_type)) {
      return row.resolved_step_type;
    }
    if (row.baseline_step_type && VALID_STEPS.has(row.baseline_step_type)) {
      return row.baseline_step_type;
    }
    return null;
  };

  const currentCounts: Record<import('@/lib/intelligence/analytics/distributions').StepType, number> = {
    STRUCTURAL: 0,
    TRANSACTIONAL: 0,
    EXCEPTION: 0,
    PROCESS: 0,
  };
  let currentUnclassifiedCount = 0;

  currentRequests.forEach((row: any) => {
    const st = getCleanStepType(row);
    if (st && currentCounts[st] !== undefined) {
      currentCounts[st]++;
    } else {
      currentUnclassifiedCount++;
    }
  });

  // Baseline comparator counts: Real observed counts from the prior-year comparable period
  const comparatorCounts: Record<import('@/lib/intelligence/analytics/distributions').StepType, number> = {
    STRUCTURAL: 0,
    TRANSACTIONAL: 0,
    EXCEPTION: 0,
    PROCESS: 0,
  };
  let comparatorUnclassifiedCount = 0;

  comparatorRequests.forEach((row: any) => {
    const st = getCleanStepType(row);
    if (st && comparatorCounts[st] !== undefined) {
      comparatorCounts[st]++;
    } else {
      comparatorUnclassifiedCount++;
    }
  });

  // Real historical periods for the same quarter (looking back up to 5 prior years)
  const historicalPeriodsCounts: Array<Record<import('@/lib/intelligence/analytics/distributions').StepType, number>> = [];
  for (let y = 1; y <= 5; y++) {
    const pKey = `${periodInfo.year - y}-${periodInfo.quarter}`;
    const pRange = getPeriodDateRange(pKey);
    const pReqs = (allRequests || []).filter((r: any) => {
      const created = new Date(r.created_at).getTime();
      return created >= new Date(pRange.startDate).getTime() && created <= new Date(pRange.endDate).getTime();
    });
    if (pReqs.length > 0) {
      const counts: Record<import('@/lib/intelligence/analytics/distributions').StepType, number> = {
        STRUCTURAL: 0,
        TRANSACTIONAL: 0,
        EXCEPTION: 0,
        PROCESS: 0,
      };
      pReqs.forEach((row: any) => {
        const st = getCleanStepType(row);
        if (st && counts[st] !== undefined) counts[st]++;
      });
      historicalPeriodsCounts.push(counts);
    }
  }

  const distribution = calculateStepDistribution(currentCounts, comparatorCounts, historicalPeriodsCounts);

  // Calculate real coverage metrics
  const totalCurrentDecisions = currentRequests.length;
  const resolvedCount = currentRequests.filter((r: any) => r.resolved_step_type !== null && r.resolved_step_type !== undefined).length;
  const stepResolutionCoverage = totalCurrentDecisions > 0
    ? resolvedCount / totalCurrentDecisions
    : 0;
  const workflowVersionCoverage = totalCurrentDecisions > 0
    ? currentRequests.filter((r: any) => r.workflow_id !== null && r.workflow_id !== undefined).length / totalCurrentDecisions
    : 0;
  const policyLinkageCoverage = totalCurrentDecisions > 0
    ? currentRequests.filter((r: any) => r.category_id !== null || r.categories?.governing_policy_id).length / totalCurrentDecisions
    : 0;

  const coveragePercentage = Math.round(stepResolutionCoverage * 100);
  const coverageMetric = {
    percentage: coveragePercentage,
    stepResolutionCoverage,
    workflowVersionCoverage,
    policyLinkageCoverage,
    comparablePeriodsCount: historicalPeriodsCounts.length,
    isReliable: totalCurrentDecisions > 0 && coveragePercentage >= 80,
    label: totalCurrentDecisions === 0
      ? 'No period decisions recorded'
      : coveragePercentage >= 80
      ? `Reliable data coverage (${coveragePercentage}%)`
      : `Partial data coverage (${coveragePercentage}%)`,
  };

  // Fetch active workflows
  const { data: workflows } = await adminClient
    .from('workflows')
    .select('id, name, category_id, base_step_type, categories(domain)')
    .eq('tenant_id', tenant.id);

  // Fetch real decision references for this tenant to compute true graph footprint
  const { data: tenantReferences } = await adminClient
    .from('decision_references')
    .select('id, source_id, target_id, to_policy_id, relationship')
    .eq('tenant_id', tenant.id);

  const refsByTarget: Record<string, number> = {};
  const refsBySource: Record<string, number> = {};
  const exceptionRefs: Record<string, number> = {};

  (tenantReferences || []).forEach((ref: any) => {
    if (ref.target_id) {
      refsByTarget[ref.target_id] = (refsByTarget[ref.target_id] || 0) + 1;
    }
    if (ref.source_id) {
      refsBySource[ref.source_id] = (refsBySource[ref.source_id] || 0) + 1;
    }
    if (ref.relationship === 'EXCEPTION_TO') {
      if (ref.target_id) exceptionRefs[ref.target_id] = (exceptionRefs[ref.target_id] || 0) + 1;
      if (ref.source_id) exceptionRefs[ref.source_id] = (exceptionRefs[ref.source_id] || 0) + 1;
    }
  });

  // Build movement analyses for each STEP type
  const movementAnalyses: any = {};
  const stepKeys: Array<'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS'> = [
    'STRUCTURAL',
    'TRANSACTIONAL',
    'EXCEPTION',
    'PROCESS',
  ];

  for (const st of stepKeys) {
    const stWorkflows = (workflows || []).filter((w: any) => w.base_step_type === st);

    let allocatedCurrent = 0;
    let allocatedBaseline = 0;

    const matchingWorkflows = stWorkflows.map((w: any) => {
      const cCount = currentRequests.filter((r: any) =>
        (r.workflow_id === w.id || r.category_id === w.category_id) &&
        getCleanStepType(r) === st
      ).length;

      const bCount = comparatorRequests.filter((r: any) =>
        (r.workflow_id === w.id || r.category_id === w.category_id) &&
        getCleanStepType(r) === st
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
      .filter((r: any) => getCleanStepType(r) === st)
      .map((r: any) => {
        const directDescendants = (refsByTarget[r.id] || 0) + (r.blast_at_seal || 0);
        const basedOnCount = refsBySource[r.id] || 0;
        const exceptionCount = exceptionRefs[r.id] || (st === 'EXCEPTION' ? 1 : 0);
        const footprintScore = directDescendants + basedOnCount;
        const classification = directDescendants >= 5
          ? 'STABLE_FOUNDATION'
          : exceptionCount > 0
          ? 'UNDER_PRESSURE'
          : directDescendants > 0
          ? 'EMERGING'
          : 'MONITOR';

        const whySurfaced = directDescendants > 0
          ? `${directDescendants} downstream references rely on this decision`
          : exceptionCount > 0
          ? 'Exception reference tracked in decision graph'
          : 'Recorded decision within tenant policy boundary';

        return {
          requestId: r.id,
          ref: r.ref,
          subject: r.subject,
          stepType: st,
          directDescendants,
          transitiveDescendants: directDescendants,
          basedOnCount,
          exceptionCount,
          footprintScore,
          classification: classification as 'STABLE_FOUNDATION' | 'UNDER_PRESSURE' | 'EMERGING' | 'MONITOR',
          whySurfaced,
        };
      });

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
    const curPolRequests = currentRequests.filter((r: any) =>
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
        comparablePeriodsCount: historicalPeriodsCounts.length,
        policyCoverage: policyLinkageCoverage,
      },
      {
        stepType: 'STRUCTURAL',
        movementPp: distribution.steps.STRUCTURAL.movementPp,
        currentShare: distribution.steps.STRUCTURAL.currentShare,
        baselineShare: distribution.steps.STRUCTURAL.comparatorShare,
        topWorkflowName: topStructuralWf,
        sampleSize: distribution.totalCurrentDecisions,
        comparablePeriodsCount: historicalPeriodsCounts.length,
        policyCoverage: policyLinkageCoverage,
      },
    ],
  });

  // Strict Server-Side Privacy Isolation (§ P0 Security Review)
  // If user grant is AGGREGATE_ONLY, strip all row-level decision records and suppress small cohorts (< 5)
  const isAggregateOnly = grantScope === 'AGGREGATE_ONLY';
  if (isAggregateOnly) {
    stepKeys.forEach((st) => {
      if (movementAnalyses[st]) {
        movementAnalyses[st].topConsequentialDecisions = [];

        // Small cohort suppression (< 5 decisions) to prevent individual employee de-anonymization
        let suppressedCurrent = 0;
        let suppressedBaseline = 0;
        const preservedContributors: any[] = [];

        movementAnalyses[st].contributors.forEach((c: any) => {
          if (c.currentCount < 5 && c.baselineCount < 5) {
            suppressedCurrent += c.currentCount;
            suppressedBaseline += c.baselineCount;
          } else {
            preservedContributors.push(c);
          }
        });

        if (suppressedCurrent > 0 || suppressedBaseline > 0) {
          const cShare = suppressedCurrent / Math.max(1, distribution.totalCurrentDecisions);
          const bShare = suppressedBaseline / Math.max(1, distribution.totalComparatorDecisions);
          const diffPp = Math.round((cShare - bShare) * 1000) / 10;
          preservedContributors.push({
            workflowId: `wf-suppressed-${st}`,
            workflowName: 'Other workflows (< 5 decisions suppressed for privacy)',
            domain: 'AGGREGATE',
            currentCount: suppressedCurrent,
            baselineCount: suppressedBaseline,
            currentShareContribution: cShare,
            baselineShareContribution: bShare,
            movementContributionPp: diffPp,
            direction: diffPp > 0.05 ? 'UP' : diffPp < -0.05 ? 'DOWN' : 'STABLE',
          });
        }

        movementAnalyses[st].contributors = preservedContributors;
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
        coverage={coverageMetric}
      />
    </div>
  );
}
