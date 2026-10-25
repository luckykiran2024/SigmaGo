import { adminClient } from '@/lib/supabase/admin';
import { IntelligenceScope } from '@/lib/intelligence/access';
import { getExceptionContext } from '@/lib/intelligence/exceptionContext';
import { collectPages } from '@/lib/intelligence/analytics/pagination';

export interface InlineExceptionSummary {
  policyId?: string;
  policyTitle?: string;
  policyReasoning?: string;
  exceptionCountYtd: number | string;
  ordinalText: string;
}

export interface PolicyHealthMetrics {
  totalPolicies: number;
  activePolicies: number;
  impactFactorTotal: number | string;
  deviationFactorYtd: number;
  averageVelocityHours: number | null;
  excludedCategoryCount: number;
}

const SMALL_NUMBER_SUPPRESSION_THRESHOLD = 5;

/**
 * Shows prior finalized exceptions to the same policy plus the pending request.
 * Suppresses small counts for AGGREGATE_ONLY access.
 */
export async function getInlineExceptionCount(
  tenantId: string,
  requestId: string,
  scope: IntelligenceScope = 'AGGREGATE_ONLY'
): Promise<InlineExceptionSummary | null> {
  try {
    const context = await getExceptionContext(tenantId, requestId);
    if (!context.policy) return null;
    const currentCount = context.ordinalThisYear;
    const policyTitle = context.policy.title;

    // Apply Small-Number Suppression for AGGREGATE_ONLY if count < threshold
    let displayCount: number | string = currentCount;
    let ordinalText = '';

    const getOrdinalSuffix = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    if (scope === 'AGGREGATE_ONLY' && currentCount < SMALL_NUMBER_SUPPRESSION_THRESHOLD) {
      displayCount = `fewer than ${SMALL_NUMBER_SUPPRESSION_THRESHOLD}`;
      ordinalText = `There have been fewer than ${SMALL_NUMBER_SUPPRESSION_THRESHOLD} exceptions to the ${policyTitle} policy this year.`;
    } else {
      ordinalText = `This is the ${getOrdinalSuffix(currentCount)} exception to the ${policyTitle} policy this year.`;
    }

    return {
      policyId: context.policy.id,
      policyTitle,
      policyReasoning: scope === 'FULL' ? (context.policy.reasoning || '') : '',
      exceptionCountYtd: displayCount,
      ordinalText,
    };
  } catch (err) {
    console.error('getInlineExceptionCount error:', err);
    return null;
  }
}

/**
 * Computes Policy Health, Impact Factor, Deviation Factor, and Velocity metrics with scope security filtering.
 */
export async function getPolicyHealthMetrics(
  tenantId: string,
  scope: IntelligenceScope = 'AGGREGATE_ONLY'
): Promise<PolicyHealthMetrics> {
  try {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

    // 1. Excluded Categories Count
    const { count: excludedCategoryCount } = await adminClient
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('exclude_from_intelligence', true);

    // 2. Fetch policies
    const { count: totalPolicies } = await adminClient
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    const { count: activePolicies } = await adminClient
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE');

    // 3. Fetch Impact Factor (BASED_ON reference links)
    const { count: rawImpactFactor } = await adminClient
      .from('decision_references')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('relationship', 'BASED_ON');

    const totalImpact = rawImpactFactor || 0;
    let impactFactorTotal: number | string = totalImpact;

    // Small-number threshold suppression for AGGREGATE_ONLY scope
    if (scope === 'AGGREGATE_ONLY' && totalImpact > 0 && totalImpact < SMALL_NUMBER_SUPPRESSION_THRESHOLD) {
      impactFactorTotal = `fewer than ${SMALL_NUMBER_SUPPRESSION_THRESHOLD}`;
    }

    // 4. Fetch Deviation Factor (EXCEPTION_TO reference links YTD)
    const { count: deviationFactorYtd } = await adminClient
      .from('decision_references')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('relationship', 'EXCEPTION_TO')
      .gte('created_at', startOfYear);

    // 5. Calculate Average Decision Velocity (hours from entered_at to acted_at)
    const completedSteps = await collectPages<any>((from, to) => adminClient
      .from('approval_steps')
      .select('id, entered_at, acted_at, approval_requests!inner(tenant_id)')
      .eq('approval_requests.tenant_id', tenantId)
      .not('acted_at', 'is', null)
      .order('id', { ascending: true })
      .range(from, to));

    let totalDurationHours = 0;
    let stepCount = 0;

    (completedSteps || []).forEach((step) => {
      if (step.entered_at && step.acted_at) {
        const diffMs = new Date(step.acted_at).getTime() - new Date(step.entered_at).getTime();
        if (Number.isFinite(diffMs) && diffMs >= 0) {
          totalDurationHours += diffMs / (1000 * 60 * 60);
          stepCount++;
        }
      }
    });

    const averageVelocityHours = stepCount > 0 ? Number((totalDurationHours / stepCount).toFixed(1)) : null;

    return {
      totalPolicies: totalPolicies || 0,
      activePolicies: activePolicies || 0,
      impactFactorTotal,
      deviationFactorYtd: deviationFactorYtd || 0,
      averageVelocityHours,
      excludedCategoryCount: excludedCategoryCount || 0,
    };
  } catch (err) {
    console.error('getPolicyHealthMetrics error:', err);
    return {
      totalPolicies: 0,
      activePolicies: 0,
      impactFactorTotal: 0,
      deviationFactorYtd: 0,
      averageVelocityHours: null,
      excludedCategoryCount: 0,
    };
  }
}
