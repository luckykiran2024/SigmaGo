/**
 * Workflow Stage Transition Engine
 * Reports empirical transitions within comparable workflow instances.
 * Rates describe observed counts; they are not forecasts or probabilities of future outcomes.
 */

import { StepType } from './distributions';

export type StageTransition = {
  stepType: StepType;
  fromStage: number | 'START' | string;
  toStage: number | 'SEALED' | 'REJECTED' | string;
  observedRate: number;
  sampleSize: number;
  transitionCount: number;
  denominatorCount: number;
  evidenceLevel: 'LOW' | 'DEVELOPING' | 'RELIABLE' | 'HIGH';
  workflowId?: string;
  contextId?: string;
  historicalBaseline?: number;
};

export function computeWorkflowStageTransitions(params: {
  stepType: StepType;
  workflowId: string;
  transitions: Array<{
    fromStage: string;
    toStage: string;
    count: number;
  }>;
}): StageTransition[] {
  const { stepType, workflowId, transitions } = params;
  for (const transition of transitions) {
    if (!Number.isSafeInteger(transition.count) || transition.count < 0) {
      throw new RangeError('Transition counts must be non-negative integers');
    }
  }

  const stageTotals = new Map<string, number>();
  for (const transition of transitions) {
    stageTotals.set(transition.fromStage, (stageTotals.get(transition.fromStage) || 0) + transition.count);
  }

  return transitions.map((transition) => {
    const denominatorCount = stageTotals.get(transition.fromStage) || 0;
    const observedRate = denominatorCount > 0
      ? Math.round((transition.count / denominatorCount) * 1000) / 1000
      : 0;

    let evidenceLevel: StageTransition['evidenceLevel'] = 'DEVELOPING';
    if (denominatorCount >= 50) evidenceLevel = 'HIGH';
    else if (denominatorCount >= 20) evidenceLevel = 'RELIABLE';
    else if (denominatorCount < 5) evidenceLevel = 'LOW';

    return {
      stepType,
      workflowId,
      fromStage: transition.fromStage,
      toStage: transition.toStage,
      transitionCount: transition.count,
      denominatorCount,
      observedRate,
      sampleSize: denominatorCount,
      evidenceLevel,
    };
  });
}
