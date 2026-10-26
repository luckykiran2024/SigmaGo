import { StepDistributionResult, StepType } from './distributions';
import { IntelligenceSignal } from './signals';

export interface OverviewSummaries {
  activity: {
    primaryText: string;
    subText: string;
    actionLabel: string;
  };
  change: {
    primaryText: string;
    subText: string;
    actionLabel: string;
  };
  attention: {
    primaryText: string;
    subText: string;
    actionLabel: string;
    hasAlerts: boolean;
  };
  confidence: {
    primaryText: string;
    subText: string;
    actionLabel: string;
    isReliable: boolean;
  };
}

const STEP_LABELS: Record<StepType, string> = {
  TRANSACTIONAL: 'Transactional',
  PROCESS: 'Process',
  EXCEPTION: 'Exception',
  STRUCTURAL: 'Structural',
};

/**
 * Deterministically generates Level 1 summary strings from existing metrics.
 * No LLM, zero synthetic data.
 */
export function generateOverviewSummaries(params: {
  distribution: StepDistributionResult;
  periodDisplayName: string;
  comparatorDisplayName: string;
  signals: IntelligenceSignal[];
  coverage?: {
    percentage: number;
    comparablePeriodsCount: number;
    isReliable: boolean;
    label: string;
  };
}): OverviewSummaries {
  const { distribution, periodDisplayName, comparatorDisplayName, signals, coverage } = params;

  // --- 1. Activity Summary ---
  const totalDecisions = distribution.totalCurrentDecisions;
  let largestStepType: StepType = 'TRANSACTIONAL';
  let largestStepShare = 0;

  const stepsList: StepType[] = ['TRANSACTIONAL', 'PROCESS', 'EXCEPTION', 'STRUCTURAL'];
  for (const st of stepsList) {
    const share = distribution.steps[st]?.currentShare || 0;
    if (share > largestStepShare) {
      largestStepShare = share;
      largestStepType = st;
    }
  }

  const largestPct = Math.round(largestStepShare * 100);
  const activityPrimary = `${totalDecisions.toLocaleString()} decisions`;
  const activitySub = totalDecisions > 0
    ? `${largestPct}% are ${STEP_LABELS[largestStepType]}`
    : `No decisions recorded for ${periodDisplayName}`;

  // --- 2. Change Summary ---
  // Find step with largest absolute movement
  let largestMovementStep: StepType | null = null;
  let maxAbsMovement = 0;

  for (const st of stepsList) {
    const item = distribution.steps[st];
    if (item && Math.abs(item.movementPp) > maxAbsMovement) {
      maxAbsMovement = Math.abs(item.movementPp);
      largestMovementStep = st;
    }
  }

  let changePrimary = 'No material change';
  let changeSub = `Broadly consistent with ${comparatorDisplayName}`;

  if (distribution.totalComparatorDecisions === 0) {
    changePrimary = 'Baseline pending';
    changeSub = `Awaiting comparable baseline period`;
  } else if (largestMovementStep && maxAbsMovement >= 1.5) {
    const item = distribution.steps[largestMovementStep];
    if (item) {
      const sign = item.movementPp > 0 ? '+' : '';
      const label = STEP_LABELS[largestMovementStep];
      changePrimary = `${label} ${sign}${item.movementPp.toFixed(1)} pp`;
      changeSub = `vs ${comparatorDisplayName}`;
    }
  }

  // --- 3. Attention Summary ---
  // Count items meeting Watch or Attention
  const attentionSignals = (signals || []).filter(
    (s) => s.impact === 'HIGH' || s.impact === 'MEDIUM' || s.signalType === 'EXCEPTION_PRESSURE'
  );
  const attentionCount = attentionSignals.length;

  const hasBaseline = distribution.totalComparatorDecisions > 0 && (coverage?.comparablePeriodsCount ?? 0) > 0;
  let attentionPrimary = hasBaseline ? 'No elevated signals detected' : 'Baseline not available';
  let attentionSub = hasBaseline ? 'No signals exceed observed thresholds' : 'Historical comparison is not yet possible';
  const hasAlerts = attentionCount > 0;

  if (attentionCount > 0) {
    const topItem = attentionSignals[0];
    const shortTitle = topItem.title.replace('Rising Exception Pressure on ', '');
    attentionPrimary = `${attentionCount} area${attentionCount > 1 ? 's' : ''} warrant${attentionCount === 1 ? 's' : ''} review`;
    attentionSub = `Highest: ${shortTitle}`;
  }

  // --- 4. Confidence Summary ---
  const covPct = coverage?.percentage ?? 0;
  const compPeriods = coverage?.comparablePeriodsCount ?? 0;
  const isReliable = (coverage?.isReliable ?? (covPct >= 80)) && compPeriods > 0;

  const confidencePrimary = isReliable ? 'Coverage supports comparison' : compPeriods === 0 ? 'Historical comparison pending' : 'More evidence needed';
  const confidenceSub = `${covPct}% coverage · ${compPeriods} comparable period${compPeriods === 1 ? '' : 's'}`;

  return {
    activity: {
      primaryText: activityPrimary,
      subText: activitySub,
      actionLabel: 'View activity →',
    },
    change: {
      primaryText: changePrimary,
      subText: changeSub,
      actionLabel: 'View change →',
    },
    attention: {
      primaryText: attentionPrimary,
      subText: attentionSub,
      actionLabel: 'View attention →',
      hasAlerts,
    },
    confidence: {
      primaryText: confidencePrimary,
      subText: confidenceSub,
      actionLabel: 'View evidence →',
      isReliable,
    },
  };
}

