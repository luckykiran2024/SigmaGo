/**
 * Intelligence Signals Engine
 * Each signal separates recorded facts from interpretation and recommendations.
 * Evidence grades describe the weaker of current and comparator samples; they are not probabilities.
 */

export interface IntelligenceSignal {
  id: string;
  signalType: 'EXCEPTION_PRESSURE' | 'STEP_MOVEMENT' | 'DRIFT_ALERT' | 'LOAD_BEARING_RELIANCE' | 'STAGE_BOTTLENECK';
  title: string;
  fact: string;
  pattern: string;
  interpretation: string;
  recommendation: string;
  magnitude: number;
  persistence: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: 'EMERGING' | 'DEVELOPING' | 'RELIABLE' | 'STRONG' | 'INSTITUTIONAL';
  confidenceBasis: {
    sampleSize: number;
    baselineSampleSize: number;
    comparablePeriodsCount: number;
    policyCoverage: number;
  };
  policyId?: string;
  workflowId?: string;
}

function evidenceGrade(currentN: number, comparatorN: number, periods: number, coverage: number): IntelligenceSignal['confidence'] {
  const effectiveN = Math.min(currentN, comparatorN);
  if (effectiveN < 10 || periods < 1 || coverage < 0.5) return 'EMERGING';
  if (effectiveN < 20) return 'DEVELOPING';
  if (effectiveN < 50) return 'RELIABLE';
  return 'STRONG';
}

export function generateIntelligenceSignals(params: {
  exceptionSignals?: Array<{
    policyId: string;
    policyTitle: string;
    totalDecisions: number;
    exceptionCount: number;
    currentRate: number;
    baselineDecisionCount: number;
    baselineExceptionCount: number;
    historicalBaselineRate: number;
    policyCoverage: number;
  }>;
  stepMovements?: Array<{
    stepType: string;
    movementPp: number;
    currentShare: number;
    baselineShare: number;
    topWorkflowName: string;
    sampleSize?: number;
    baselineSampleSize?: number;
    comparablePeriodsCount?: number;
    policyCoverage?: number;
  }>;
}): IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = [];

  // A comparison requires meaningful samples on both sides. A missing comparator is not a zero-rate baseline.
  for (const es of params.exceptionSignals || []) {
    const periods = es.baselineDecisionCount > 0 ? 1 : 0;
    const coverage = Math.max(0, Math.min(1, es.policyCoverage || 0));
    if (
      es.totalDecisions < 10 || es.baselineDecisionCount < 10 || periods === 0 ||
      es.currentRate <= es.historicalBaselineRate + 0.10
    ) continue;

    const diffPp = Math.round((es.currentRate - es.historicalBaselineRate) * 1000) / 10;
    signals.push({
      id: `sig-exp-${es.policyId}`,
      signalType: 'EXCEPTION_PRESSURE',
      title: `Rising Exception Pressure on ${es.policyTitle}`,
      fact: `${es.exceptionCount} of ${es.totalDecisions} current-period decisions and ${es.baselineExceptionCount} of ${es.baselineDecisionCount} comparator-period decisions were exceptions under ${es.policyTitle}.`,
      pattern: `Observed exception rate is ${(es.currentRate * 100).toFixed(1)}% versus ${(es.historicalBaselineRate * 100).toFixed(1)}% in the comparator period (${diffPp.toFixed(1)} percentage points higher).`,
      interpretation: 'Recorded exception activity is higher than the selected comparable period; review the underlying decisions before drawing conclusions.',
      recommendation: `Review the ${es.policyTitle} criteria with its policy owners and inspect the linked decisions.`,
      magnitude: diffPp,
      persistence: 1,
      impact: diffPp >= 20 ? 'HIGH' : 'MEDIUM',
      confidence: evidenceGrade(es.totalDecisions, es.baselineDecisionCount, periods, coverage),
      confidenceBasis: {
        sampleSize: es.totalDecisions,
        baselineSampleSize: es.baselineDecisionCount,
        comparablePeriodsCount: periods,
        policyCoverage: coverage,
      },
      policyId: es.policyId,
    });
  }

  for (const sm of params.stepMovements || []) {
    if (Math.abs(sm.movementPp) < 2.0) continue;
    const sign = sm.movementPp > 0 ? '+' : '';
    const currentN = sm.sampleSize ?? 0;
    const baselineN = sm.baselineSampleSize ?? 0;
    const periods = sm.comparablePeriodsCount ?? 0;
    const coverage = Math.max(0, Math.min(1, sm.policyCoverage ?? 0));
    const confidence = evidenceGrade(currentN, baselineN, periods, coverage);
    signals.push({
      id: `sig-step-${sm.stepType}`,
      signalType: 'STEP_MOVEMENT',
      title: `${sm.stepType} Decision Shift (${sign}${sm.movementPp.toFixed(1)} pp)`,
      fact: `${sm.stepType} decisions represent ${(sm.currentShare * 100).toFixed(1)}% of current-period decisions.`,
      pattern: `Observed share shifted by ${sign}${sm.movementPp.toFixed(1)} percentage points versus the selected comparable history.`,
      interpretation: `The recorded mix changed; activity in ${sm.topWorkflowName} is the largest identified contributor.`,
      recommendation: `Inspect the decisions and workflow contributors behind the ${sm.stepType} movement.`,
      magnitude: Math.abs(sm.movementPp),
      persistence: 1,
      impact: Math.abs(sm.movementPp) >= 4.0 ? 'HIGH' : 'MEDIUM',
      confidence,
      confidenceBasis: {
        sampleSize: currentN,
        baselineSampleSize: baselineN,
        comparablePeriodsCount: periods,
        policyCoverage: coverage,
      },
    });
  }

  return signals;
}
