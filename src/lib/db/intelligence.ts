import { adminClient } from '@/lib/supabase/admin';
import { IntelligenceScope } from '@/lib/intelligence/access';

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
  averageVelocityHours: number;
  excludedCategoryCount: number;
}

const SMALL_NUMBER_SUPPRESSION_THRESHOLD = 5;

/**
 * Computes real-time YTD inline exception count for approver guidance at decision time.
 * Suppresses exact count when Impact Factor < 5 for AGGREGATE_ONLY scope.
 */
export async function getInlineExceptionCount(
  tenantId: string,
  categoryId?: string,
  policyId?: string,
  scope: IntelligenceScope = 'AGGREGATE_ONLY'
): Promise<InlineExceptionSummary | null> {
  try {
    let targetPolicyId = policyId;
    let policyTitle = 'Governing Policy';
    let policyReasoning = '';

    // 1. Check if category is excluded from intelligence
    if (categoryId) {
      const { data: category } = await adminClient
        .from('categories')
        .select('id, name, step_type, governing_policy_id, exclude_from_intelligence')
        .eq('id', categoryId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (category?.exclude_from_intelligence) {
        return null; // Excluded categories contribute to no metrics
      }

      if (category?.governing_policy_id && !targetPolicyId) {
        targetPolicyId = category.governing_policy_id;
      }
    }

    // 2. Fetch policy details if policy ID is known
    if (targetPolicyId) {
      const { data: policy } = await adminClient
        .from('policies')
        .select('id, title, reasoning')
        .eq('id', targetPolicyId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (policy) {
        policyTitle = policy.title;
        // Exception justification notes/reasoning are masked for AGGREGATE_ONLY
        policyReasoning = scope === 'FULL' ? (policy.reasoning || '') : '';
      }
    }

    // 3. Calculate YTD exceptions for this tenant & policy
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

    let query = adminClient
      .from('approval_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfYear);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { count } = await query;
    const currentCount = (count || 0) + 1;

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
      policyId: targetPolicyId,
      policyTitle,
      policyReasoning,
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
    const { data: policies } = await adminClient
      .from('policies')
      .select('id, status')
      .eq('tenant_id', tenantId);

    const totalPolicies = policies?.length || 0;
    const activePolicies = (policies || []).filter((p) => p.status === 'ACTIVE').length;

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
    const { data: completedSteps } = await adminClient
      .from('approval_steps')
      .select('entered_at, acted_at')
      .not('acted_at', 'is', null)
      .limit(100);

    let totalDurationHours = 0;
    let stepCount = 0;

    (completedSteps || []).forEach((step) => {
      if (step.entered_at && step.acted_at) {
        const diffMs = new Date(step.acted_at).getTime() - new Date(step.entered_at).getTime();
        totalDurationHours += diffMs / (1000 * 60 * 60);
        stepCount++;
      }
    });

    const averageVelocityHours = stepCount > 0 ? Number((totalDurationHours / stepCount).toFixed(1)) : 12;

    return {
      totalPolicies,
      activePolicies,
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
      averageVelocityHours: 0,
      excludedCategoryCount: 0,
    };
  }
}
