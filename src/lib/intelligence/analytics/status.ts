import { StepType, StepShareMetric } from './distributions';

export type NormalizedStatus = 'Normal' | 'Watch' | 'Attention' | 'Baseline pending';

export interface StepStatusInfo {
  label: NormalizedStatus;
  badge: 'badge-normal' | 'badge-watch' | 'badge-attention';
  desc: string;
}

/**
 * Evaluates the status of a STEP metric.
 * Fixes the unreachable Attention threshold by evaluating > 4.0 pp before > 2.0 pp.
 *
 * Rules:
 * - EXCEPTION:
 *   - > 4.0 pp: Attention
 *   - > 2.0 pp: Watch (i.e. > 2.0 and <= 4.0)
 *   - <= 2.0 pp: Normal
 * - Non-EXCEPTION:
 *   - |movementPp| <= 0.5: Normal (Consistent with comparator)
 *   - movementPp > 0: Normal (Higher than comparator)
 *   - movementPp <= 0: Normal (Lower than comparator)
 */
export function getStepStatus(
  stepType: StepType,
  item: Pick<StepShareMetric, 'movementPp'>,
  totalComparatorDecisions: number,
  comparatorDisplayName: string
): StepStatusInfo {
  if (totalComparatorDecisions === 0) {
    return {
      label: 'Baseline pending',
      badge: 'badge-normal',
      desc: 'Awaiting comparable baseline period',
    };
  }

  if (stepType === 'EXCEPTION') {
    // Corrected evaluation order: check > 4.0 pp first so Attention is reachable
    if (item.movementPp > 4.0) {
      return {
        label: 'Attention',
        badge: 'badge-attention',
        desc: `Above baseline (${comparatorDisplayName})`,
      };
    }
    if (item.movementPp > 2.0) {
      return {
        label: 'Watch',
        badge: 'badge-watch',
        desc: `Higher than ${comparatorDisplayName}`,
      };
    }
    return {
      label: 'Normal',
      badge: 'badge-normal',
      desc: 'Within expected baseline',
    };
  }

  // Non-EXCEPTION steps: normalize vocabulary to Normal
  if (Math.abs(item.movementPp) <= 0.5) {
    return {
      label: 'Normal',
      badge: 'badge-normal',
      desc: `Consistent with ${comparatorDisplayName}`,
    };
  }

  if (item.movementPp > 0) {
    return {
      label: 'Normal',
      badge: 'badge-normal',
      desc: `Higher than ${comparatorDisplayName}`,
    };
  }

  return {
    label: 'Normal',
    badge: 'badge-normal',
    desc: `Lower than ${comparatorDisplayName}`,
  };
}
