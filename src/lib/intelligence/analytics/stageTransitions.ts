/**
 * Workflow Stage Transition Engine
 * Models real process progression inside comparable workflow instances.
 * GUARDRAIL: Never models chronological STEP-to-STEP sequences across unrelated decisions.
 */

import { StepType } from './distributions';

export interface StageTransition {
  stepType: StepType;          // dimension used to slice the process
  fromStage: string;           // 'START', 'Stage 0', 'Stage 1'
  toStage: string;             // 'Stage 1', 'SEALED', 'REJECTED'
  observedProbability: number; // transition_count / denominator_count
  transitionCount: number;
  denominatorCount: number;
  sampleSize: number;
  confidenceLabel: 'LOW' | 'DEVELOPING' | 'RELIABLE' | 'HIGH';
  workflowId?: string;
  contextId?: string;
  historicalBaseline?: number;
}

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

  // Group by fromStage to calculate denominators
  const stageTotals = new Map<string, number>();
  for (const t of transitions) {
    stageTotals.set(t.fromStage, (stageTotals.get(t.fromStage) || 0) + t.count);
  }

  return transitions.map((t) => {
    const totalFrom = stageTotals.get(t.fromStage) || 1;
    const observedProbability = Math.round((t.count / totalFrom) * 1000) / 1000;

    let confidenceLabel: StageTransition['confidenceLabel'] = 'DEVELOPING';
    if (totalFrom >= 50) confidenceLabel = 'HIGH';
    else if (totalFrom >= 20) confidenceLabel = 'RELIABLE';
    else if (totalFrom < 5) confidenceLabel = 'LOW';

    return {
      stepType,
      workflowId,
      fromStage: t.fromStage,
      toStage: t.toStage,
      transitionCount: t.count,
      denominatorCount: totalFrom,
      observedProbability,
      sampleSize: totalFrom,
      confidenceLabel,
    };
  });
}
