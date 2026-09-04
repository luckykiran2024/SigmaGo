/**
 * Contributor Decomposition & Consequential Decisions Engine
 * Mathematically reconciles workflow contributions to STEP percentage point movements.
 */

import { StepType } from './distributions';

export interface WorkflowContribution {
  workflowId: string;
  workflowName: string;
  domain: string;
  currentCount: number;
  baselineCount: number;
  currentShareContribution: number;  // current_count_w / current_total_all
  baselineShareContribution: number; // baseline_count_w / baseline_total_all
  movementContributionPp: number;    // 100 * (current - baseline)
  direction: 'UP' | 'DOWN' | 'STABLE';
}

export interface ConsequentialDecision {
  requestId: string;
  ref: string;
  subject: string;
  stepType: StepType;
  directDescendants: number;
  transitiveDescendants: number;
  basedOnCount: number;
  exceptionCount: number;
  footprintScore: number;
  classification: 'STABLE_FOUNDATION' | 'UNDER_PRESSURE' | 'EMERGING' | 'MONITOR';
  whySurfaced: string;
}

export interface StepMovementAnalysis {
  stepType: StepType;
  currentShare: number;
  comparatorShare: number;
  movementPp: number;
  totalCurrentAll: number;
  totalBaselineAll: number;
  contributors: WorkflowContribution[];
  reconciledMovementPp: number;
  topConsequentialDecisions: ConsequentialDecision[];
}

export function analyzeStepMovement(params: {
  stepType: StepType;
  currentShare: number;
  comparatorShare: number;
  movementPp: number;
  totalCurrentAll: number;
  totalBaselineAll: number;
  workflowData: Array<{
    workflowId: string;
    workflowName: string;
    domain?: string;
    currentCount: number;
    baselineCount: number;
  }>;
  consequentialDecisions: ConsequentialDecision[];
}): StepMovementAnalysis {
  const { stepType, currentShare, comparatorShare, movementPp, totalCurrentAll, totalBaselineAll, workflowData, consequentialDecisions } = params;

  const validTotalCurrent = Math.max(1, totalCurrentAll);
  const validTotalBaseline = Math.max(1, totalBaselineAll);

  const contributors: WorkflowContribution[] = workflowData.map((w) => {
    const cShare = w.currentCount / validTotalCurrent;
    const bShare = w.baselineCount / validTotalBaseline;
    const diffPp = Math.round((cShare - bShare) * 1000) / 10;

    let direction: WorkflowContribution['direction'] = 'STABLE';
    if (diffPp > 0.05) direction = 'UP';
    else if (diffPp < -0.05) direction = 'DOWN';

    return {
      workflowId: w.workflowId,
      workflowName: w.workflowName,
      domain: w.domain || 'GENERAL',
      currentCount: w.currentCount,
      baselineCount: w.baselineCount,
      currentShareContribution: cShare,
      baselineShareContribution: bShare,
      movementContributionPp: diffPp,
      direction,
    };
  });

  // Sort contributors descending by absolute movement contribution
  contributors.sort((a, b) => Math.abs(b.movementContributionPp) - Math.abs(a.movementContributionPp));

  // Verify mathematical reconciliation (sum of workflow movement pp)
  let reconciledMovementPp = Math.round(
    contributors.reduce((acc, c) => acc + c.movementContributionPp, 0) * 10
  ) / 10;

  // Exact reconciliation: If fractional rounding discrepancy exists, assign remainder to highest contributor
  if (contributors.length > 0 && totalCurrentAll > 0 && totalBaselineAll > 0) {
    const roundingDelta = Math.round((movementPp - reconciledMovementPp) * 10) / 10;
    if (Math.abs(roundingDelta) > 0 && Math.abs(roundingDelta) <= 0.2) {
      contributors[0].movementContributionPp = Math.round(
        (contributors[0].movementContributionPp + roundingDelta) * 10
      ) / 10;
      reconciledMovementPp = Math.round(
        contributors.reduce((acc, c) => acc + c.movementContributionPp, 0) * 10
      ) / 10;
    }
  }

  // Top 10 consequential decisions ranked by footprint score
  const topConsequentialDecisions = consequentialDecisions
    .filter((d) => d.stepType === stepType)
    .sort((a, b) => b.footprintScore - a.footprintScore)
    .slice(0, 10);

  return {
    stepType,
    currentShare,
    comparatorShare,
    movementPp,
    totalCurrentAll,
    totalBaselineAll,
    contributors,
    reconciledMovementPp,
    topConsequentialDecisions,
  };
}
