/**
 * Intelligence Signals Engine
 * Preserves the 4-layer architecture: Fact -> Pattern -> Interpretation -> Recommendation.
 */

export interface IntelligenceSignal {
  id: string;
  signalType: 'EXCEPTION_PRESSURE' | 'STEP_MOVEMENT' | 'DRIFT_ALERT' | 'LOAD_BEARING_RELIANCE' | 'STAGE_BOTTLENECK';
  title: string;
  fact: string;            // Recorded/system-observed evidence
  pattern: string;         // Derived aggregation or statistical pattern
  interpretation: string;  // What the pattern may mean
  recommendation: string;  // Actionable review recommendation (never prescriptive AI decision)
  magnitude: number;
  persistence: number;     // Number of consecutive comparable periods observed
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: 'EMERGING' | 'DEVELOPING' | 'RELIABLE' | 'STRONG' | 'INSTITUTIONAL';
  confidenceBasis: {
    sampleSize: number;
    comparablePeriodsCount: number;
    policyCoverage: number;
  };
  policyId?: string;
  workflowId?: string;
}

export function generateIntelligenceSignals(params: {
  exceptionSignals?: Array<{
    policyId: string;
    policyTitle: string;
    totalDecisions: number;
    exceptionCount: number;
    currentRate: number;
    historicalBaselineRate: number;
  }>;
  stepMovements?: Array<{
    stepType: string;
    movementPp: number;
    currentShare: number;
    baselineShare: number;
    topWorkflowName: string;
    sampleSize?: number;
    comparablePeriodsCount?: number;
    policyCoverage?: number;
  }>;
}): IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = [];

  // Exception pressure signals
  if (params.exceptionSignals) {
    for (const es of params.exceptionSignals) {
      if (es.currentRate > es.historicalBaselineRate + 0.10 && es.totalDecisions >= 10) {
        const diffPp = Math.round((es.currentRate - es.historicalBaselineRate) * 1000) / 10;
        signals.push({
          id: `sig-exp-${es.policyId}`,
          signalType: 'EXCEPTION_PRESSURE',
          title: `Rising Exception Pressure on ${es.policyTitle}`,
          fact: `${es.exceptionCount} of ${es.totalDecisions} comparable decisions were exceptions under ${es.policyTitle}.`,
          pattern: `Exception rate is ${diffPp.toFixed(1)} percentage points above the historical comparable baseline.`,
          interpretation: 'Operating behaviour consistently deviates from configured policy criteria during this period.',
          recommendation: `Conduct a policy review of ${es.policyTitle} criteria with domain owners.`,
          magnitude: diffPp,
          persistence: 1,
          impact: diffPp >= 20 ? 'HIGH' : 'MEDIUM',
          confidence: es.totalDecisions >= 50 ? 'STRONG' : 'RELIABLE',
          confidenceBasis: {
            sampleSize: es.totalDecisions,
            comparablePeriodsCount: es.historicalBaselineRate > 0 ? 2 : 1,
            policyCoverage: 1.0,
          },
          policyId: es.policyId,
        });
      }
    }
  }

  // STEP movement signals
  if (params.stepMovements) {
    for (const sm of params.stepMovements) {
      if (Math.abs(sm.movementPp) >= 2.0) {
        const sign = sm.movementPp > 0 ? '+' : '';
        const effectiveSample = sm.sampleSize ?? 0;
        const confidenceLevel = effectiveSample >= 50 ? 'STRONG' : effectiveSample >= 10 ? 'RELIABLE' : 'EMERGING';
        signals.push({
          id: `sig-step-${sm.stepType}`,
          signalType: 'STEP_MOVEMENT',
          title: `${sm.stepType} Decision Shift (${sign}${sm.movementPp.toFixed(1)} pp)`,
          fact: `${sm.stepType} decisions represent ${(sm.currentShare * 100).toFixed(1)}% of all organizational decisions.`,
          pattern: `${sm.stepType} share shifted by ${sign}${sm.movementPp.toFixed(1)} percentage points vs comparable prior year baseline.`,
          interpretation: `Movement is primarily driven by activity in ${sm.topWorkflowName}.`,
          recommendation: `Inspect consequential decisions and workflow contributors in the ${sm.stepType} movement panel.`,
          magnitude: Math.abs(sm.movementPp),
          persistence: 1,
          impact: Math.abs(sm.movementPp) >= 4.0 ? 'HIGH' : 'MEDIUM',
          confidence: confidenceLevel,
          confidenceBasis: {
            sampleSize: effectiveSample,
            comparablePeriodsCount: sm.comparablePeriodsCount ?? (sm.baselineShare > 0 ? 2 : 1),
            policyCoverage: sm.policyCoverage ?? 1.0,
          },
        });
      }
    }
  }

  return signals;
}
