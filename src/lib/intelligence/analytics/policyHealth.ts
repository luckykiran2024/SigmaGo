/**
 * Policy Health & Longitudinal Transition Engine
 * Models the health state of governing policies across comparable periods.
 */

export type PolicyHealthState = 'HEALTHY' | 'WATCH' | 'DRIFTING' | 'REVISED' | 'RETIRED';

export interface PolicyHealthAssessment {
  policyId: string;
  policyTitle: string;
  periodKey: string;
  totalGovernedDecisions: number;
  basedOnCount: number;
  exceptionCount: number;
  governanceRate: number;
  historicalExceptionRate: number;
  healthState: PolicyHealthState;
  explanation: string;
}

export interface PolicyHealthTransition {
  policyId: string;
  fromPeriodKey: string;
  toPeriodKey: string;
  fromState: PolicyHealthState;
  toState: PolicyHealthState;
  observedProbability: number;
  sampleSize: number;
  confidenceLabel: 'LOW' | 'DEVELOPING' | 'RELIABLE' | 'HIGH';
}

export function evaluatePolicyHealth(params: {
  policyId: string;
  policyTitle: string;
  periodKey: string;
  basedOnCount: number;
  exceptionCount: number;
  historicalExceptionRate: number;
  isRetired?: boolean;
  isRevised?: boolean;
}): PolicyHealthAssessment {
  const { policyId, policyTitle, periodKey, basedOnCount, exceptionCount, historicalExceptionRate, isRetired, isRevised } = params;

  if (isRetired) {
    return {
      policyId,
      policyTitle,
      periodKey,
      totalGovernedDecisions: basedOnCount + exceptionCount,
      basedOnCount,
      exceptionCount,
      governanceRate: basedOnCount + exceptionCount > 0 ? basedOnCount / (basedOnCount + exceptionCount) : 1,
      historicalExceptionRate,
      healthState: 'RETIRED',
      explanation: 'Policy has been explicitly retired or superseded.',
    };
  }

  if (isRevised) {
    return {
      policyId,
      policyTitle,
      periodKey,
      totalGovernedDecisions: basedOnCount + exceptionCount,
      basedOnCount,
      exceptionCount,
      governanceRate: basedOnCount + exceptionCount > 0 ? basedOnCount / (basedOnCount + exceptionCount) : 1,
      historicalExceptionRate,
      healthState: 'REVISED',
      explanation: 'Policy has undergone a formal revision.',
    };
  }

  const total = basedOnCount + exceptionCount;
  const currentExceptionRate = total > 0 ? exceptionCount / total : 0;
  const governanceRate = total > 0 ? basedOnCount / total : 1.0;

  let healthState: PolicyHealthState = 'HEALTHY';
  let explanation = 'Governing policy is operating normally within historical exception boundaries.';

  // If current exception rate exceeds historical baseline significantly (> 15 pp)
  if (total >= 10 && currentExceptionRate > historicalExceptionRate + 0.15) {
    healthState = 'DRIFTING';
    explanation = `Exception rate (${(currentExceptionRate * 100).toFixed(1)}%) is significantly above the historical comparable baseline (${(historicalExceptionRate * 100).toFixed(1)}%). Review of policy criteria is warranted.`;
  } else if (total >= 5 && currentExceptionRate > historicalExceptionRate + 0.05) {
    healthState = 'WATCH';
    explanation = `Exception rate (${(currentExceptionRate * 100).toFixed(1)}%) is moderately elevated above baseline (${(historicalExceptionRate * 100).toFixed(1)}%). Monitoring recommended.`;
  }

  return {
    policyId,
    policyTitle,
    periodKey,
    totalGovernedDecisions: total,
    basedOnCount,
    exceptionCount,
    governanceRate: Math.round(governanceRate * 1000) / 1000,
    historicalExceptionRate,
    healthState,
    explanation,
  };
}
