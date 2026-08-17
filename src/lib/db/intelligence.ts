import { adminClient } from '@/lib/supabase/admin';

export interface InlineExceptionSummary {
  policyId?: string;
  policyTitle?: string;
  policyReasoning?: string;
  exceptionCountYtd: number;
  ordinalText: string;
}

export interface PolicyHealthMetrics {
  totalPolicies: number;
  activePolicies: number;
  impactFactorTotal: number;
  deviationFactorYtd: number;
  averageVelocityHours: number;
}

/**
 * Computes real-time YTD inline exception count for approver guidance at decision time.
 * Example result: "This is the 4th exception to the Increment Cap policy this year."
 */
export async function getInlineExceptionCount(
  tenantId: string,
  categoryId?: string,
  policyId?: string
): Promise<InlineExceptionSummary | null> {
  try {
    let targetPolicyId = policyId;
    let policyTitle = 'Governing Policy';
    let policyReasoning = '';

    // 1. If categoryId is provided, resolve governing policy if policyId not explicitly passed
    if (categoryId && !targetPolicyId) {
      const { data: category } = await adminClient
        .from('categories')
        .select('id, name, step_type, governing_policy_id')
        .eq('id', categoryId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (category?.governing_policy_id) {
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
        policyReasoning = policy.reasoning || '';
      }
    }

    // 3. Calculate YTD exceptions for this tenant & policy (or exception category)
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
    const currentOrdinal = (count || 0) + 1;

    const getOrdinalSuffix = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return {
      policyId: targetPolicyId,
      policyTitle,
      policyReasoning,
      exceptionCountYtd: currentOrdinal,
      ordinalText: `This is the ${getOrdinalSuffix(currentOrdinal)} exception to the ${policyTitle} policy this year.`
    };
  } catch (err) {
    console.error('getInlineExceptionCount error:', err);
    return null;
  }
}

/**
 * Computes Policy Health, Impact Factor, Deviation Factor, and Decision Velocity metrics.
 */
export async function getPolicyHealthMetrics(tenantId: string): Promise<PolicyHealthMetrics> {
  try {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

    // 1. Fetch total & active policies
    const { data: policies } = await adminClient
      .from('policies')
      .select('id, status')
      .eq('tenant_id', tenantId);

    const totalPolicies = policies?.length || 0;
    const activePolicies = (policies || []).filter(p => p.status === 'ACTIVE').length;

    // 2. Fetch Impact Factor (BASED_ON reference links)
    const { count: impactFactorTotal } = await adminClient
      .from('decision_references')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('relationship', 'BASED_ON');

    // 3. Fetch Deviation Factor (EXCEPTION_TO reference links YTD)
    const { count: deviationFactorYtd } = await adminClient
      .from('decision_references')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('relationship', 'EXCEPTION_TO')
      .gte('created_at', startOfYear);

    // 4. Calculate Average Decision Velocity (hours from entered_at to acted_at)
    const { data: completedSteps } = await adminClient
      .from('approval_steps')
      .select('entered_at, acted_at')
      .not('acted_at', 'is', null)
      .limit(100);

    let totalDurationHours = 0;
    let stepCount = 0;

    (completedSteps || []).forEach(step => {
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
      impactFactorTotal: impactFactorTotal || 0,
      deviationFactorYtd: deviationFactorYtd || 0,
      averageVelocityHours
    };
  } catch (err) {
    console.error('getPolicyHealthMetrics error:', err);
    return {
      totalPolicies: 0,
      activePolicies: 0,
      impactFactorTotal: 0,
      deviationFactorYtd: 0,
      averageVelocityHours: 0
    };
  }
}
