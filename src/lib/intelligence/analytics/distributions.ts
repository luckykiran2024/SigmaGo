/**
 * STEP Distribution Engine
 * Computes S, T, E, P decision shares and percentage-point (pp) movement against comparable baselines.
 * No synthetic ranges or placeholder fallbacks.
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
  historicalRange?: {
    minShare: number;
    maxShare: number;
    periodCount: number;
    hasHistoricalRange: boolean; // True if >= 3 comparable periods observed
  } | null;
  confidence: 'EMERGING' | 'DEVELOPING' | 'RELIABLE' | 'STRONG' | 'INSTITUTIONAL';
}

export interface StepDistributionResult {
  totalCurrentDecisions: number;
  totalComparatorDecisions: number;
  steps: Record<StepType, StepShareMetric>;
}

export function calculateStepDistribution(
  currentCounts: Record<StepType, number>,
  comparatorCounts: Record<StepType, number>,
  historicalPeriodsInput?: Array<Record<StepType, number>> | Record<StepType, { minShare: number; maxShare: number; periodCount: number }>
): StepDistributionResult {
  const totalCurrent = (currentCounts.STRUCTURAL || 0) +
    (currentCounts.TRANSACTIONAL || 0) +
    (currentCounts.EXCEPTION || 0) +
    (currentCounts.PROCESS || 0);

  const totalComparator = (comparatorCounts.STRUCTURAL || 0) +
    (comparatorCounts.TRANSACTIONAL || 0) +
    (comparatorCounts.EXCEPTION || 0) +
    (comparatorCounts.PROCESS || 0);

  const stepKeys: StepType[] = ['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS'];
  const steps = {} as Record<StepType, StepShareMetric>;

  // Pre-calculate shares for historical periods if array was provided
  const historicalSharesByStep: Record<StepType, number[]> = {
    STRUCTURAL: [],
    TRANSACTIONAL: [],
    EXCEPTION: [],
    PROCESS: [],
  };

  if (Array.isArray(historicalPeriodsInput)) {
    historicalPeriodsInput.forEach((periodCounts) => {
      const pTotal = (periodCounts.STRUCTURAL || 0) +
        (periodCounts.TRANSACTIONAL || 0) +
        (periodCounts.EXCEPTION || 0) +
        (periodCounts.PROCESS || 0);
      if (pTotal > 0) {
        stepKeys.forEach((st) => {
          historicalSharesByStep[st].push((periodCounts[st] || 0) / pTotal);
        });
      }
    });
  }

  for (const st of stepKeys) {
    const cCount = currentCounts[st] || 0;
    const compCount = comparatorCounts[st] || 0;

    const cShare = totalCurrent > 0 ? cCount / totalCurrent : 0;
    const compShare = totalComparator > 0 ? compCount / totalComparator : 0;

    // Movement in percentage points (100 * (current_share - baseline_share))
    const movementPp = totalCurrent > 0 && totalComparator > 0
      ? Math.round((cShare - compShare) * 1000) / 10
      : 0;

    const sign = movementPp > 0 ? '+' : '';
    const movementLabel = totalCurrent > 0 && totalComparator > 0
      ? `${sign}${movementPp.toFixed(1)} pp`
      : '0.0 pp';

    // Contextual status classification based on magnitude of percentage point shift
    let status: StepShareMetric['status'] = 'NORMAL';
    if (Math.abs(movementPp) >= 5.0) {
      status = 'STRUCTURAL_SHIFT';
    } else if (Math.abs(movementPp) >= 3.0) {
      status = 'SIGNIFICANT_CHANGE';
    } else if (Math.abs(movementPp) >= 1.5) {
      status = 'ELEVATED';
    }

    // Historical range derived strictly from >= 3 observed historical same-quarter periods
    let historicalRange: StepShareMetric['historicalRange'] = undefined;

    if (Array.isArray(historicalPeriodsInput)) {
      const shares = historicalSharesByStep[st];
      if (shares.length >= 3) {
        historicalRange = {
          minShare: Math.min(...shares),
          maxShare: Math.max(...shares),
          periodCount: shares.length,
          samplePeriodsCount: shares.length,
          hasHistoricalRange: true,
        };
      }
    } else if (historicalPeriodsInput && (historicalPeriodsInput as any)[st]) {
      const obs = (historicalPeriodsInput as any)[st];
      if (obs.periodCount >= 3) {
        historicalRange = {
          minShare: obs.minShare,
          maxShare: obs.maxShare,
          periodCount: obs.periodCount,
          samplePeriodsCount: obs.periodCount,
          hasHistoricalRange: true,
        };
      }
    }

    // Dynamic confidence score based on actual decision sample size
    let confidence: StepShareMetric['confidence'] = 'EMERGING';
    if (cCount >= 100) confidence = 'INSTITUTIONAL';
    else if (cCount >= 50) confidence = 'STRONG';
    else if (cCount >= 20) confidence = 'RELIABLE';
    else if (cCount >= 5) confidence = 'DEVELOPING';

    steps[st] = {
      stepType: st,
      currentCount: cCount,
      currentShare: Math.round(cShare * 1000) / 1000,
      comparatorCount: compCount,
      comparatorShare: Math.round(compShare * 1000) / 1000,
      movementPp,
      movementLabel,
      status,
      historicalRange,
      confidence,
    };
  }

  return {
    totalCurrentDecisions: totalCurrent,
    totalComparatorDecisions: totalComparator,
    steps,
  };
}
