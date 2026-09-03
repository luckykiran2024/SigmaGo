/**
 * STEP Distribution Engine
 * Computes S, T, E, P decision shares and percentage-point (pp) movement against comparable baselines.
 */

export type StepType = 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';

export interface StepShareMetric {
  stepType: StepType;
  currentCount: number;
  currentShare: number;          // e.g. 0.14 for 14%
  comparatorCount: number;
  comparatorShare: number;       // e.g. 0.12 for 12%
  movementPp: number;            // e.g. +2.0 percentage points (+0.02)
  movementLabel: string;         // "+2.0 pp"
  status: 'NORMAL' | 'ELEVATED' | 'SIGNIFICANT_CHANGE' | 'EMERGING_PATTERN' | 'STRUCTURAL_SHIFT';
  historicalRange: { minShare: number; maxShare: number };
  confidence: 'EMERGING' | 'DEVELOPING' | 'RELIABLE' | 'STRONG' | 'INSTITUTIONAL';
}

export interface StepDistributionResult {
  totalCurrentDecisions: number;
  totalComparatorDecisions: number;
  steps: Record<StepType, StepShareMetric>;
}

export function calculateStepDistribution(
  currentCounts: Record<StepType, number>,
  comparatorCounts: Record<StepType, number>
): StepDistributionResult {
  const totalCurrent = Math.max(
    1,
    (currentCounts.STRUCTURAL || 0) +
    (currentCounts.TRANSACTIONAL || 0) +
    (currentCounts.EXCEPTION || 0) +
    (currentCounts.PROCESS || 0)
  );

  const totalComparator = Math.max(
    1,
    (comparatorCounts.STRUCTURAL || 0) +
    (comparatorCounts.TRANSACTIONAL || 0) +
    (comparatorCounts.EXCEPTION || 0) +
    (comparatorCounts.PROCESS || 0)
  );

  const stepKeys: StepType[] = ['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS'];
  const steps = {} as Record<StepType, StepShareMetric>;

  for (const st of stepKeys) {
    const cCount = currentCounts[st] || 0;
    const compCount = comparatorCounts[st] || 0;

    const cShare = cCount / totalCurrent;
    const compShare = compCount / totalComparator;

    // Movement in percentage points (100 * (current_share - baseline_share))
    const movementPp = Math.round((cShare - compShare) * 1000) / 10; // e.g. +2.0
    const sign = movementPp > 0 ? '+' : '';
    const movementLabel = `${sign}${movementPp.toFixed(1)} pp`;

    // Contextual status classification based on magnitude of percentage point shift
    let status: StepShareMetric['status'] = 'NORMAL';
    if (Math.abs(movementPp) >= 5.0) {
      status = 'STRUCTURAL_SHIFT';
    } else if (Math.abs(movementPp) >= 3.0) {
      status = 'SIGNIFICANT_CHANGE';
    } else if (Math.abs(movementPp) >= 1.5) {
      status = 'ELEVATED';
    }

    // Historical range placeholder (± 2 pp from baseline)
    const minShare = Math.max(0, compShare - 0.02);
    const maxShare = Math.min(1, compShare + 0.02);

    let confidence: StepShareMetric['confidence'] = 'DEVELOPING';
    if (cCount >= 100) confidence = 'INSTITUTIONAL';
    else if (cCount >= 50) confidence = 'STRONG';
    else if (cCount >= 20) confidence = 'RELIABLE';

    steps[st] = {
      stepType: st,
      currentCount: cCount,
      currentShare: Math.round(cShare * 1000) / 1000,
      comparatorCount: compCount,
      comparatorShare: Math.round(compShare * 1000) / 1000,
      movementPp,
      movementLabel,
      status,
      historicalRange: { minShare, maxShare },
      confidence,
    };
  }

  return {
    totalCurrentDecisions: totalCurrent,
    totalComparatorDecisions: totalComparator,
    steps,
  };
}
