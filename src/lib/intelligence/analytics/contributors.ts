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

  const hasComparator = totalCurrentAll > 0 && totalBaselineAll > 0;
  const rawTenths: number[] = [];
  const contributors: WorkflowContribution[] = workflowData.map((w) => {
    const cShare = w.currentCount / validTotalCurrent;
    const bShare = w.baselineCount / validTotalBaseline;
    const raw = hasComparator ? (cShare - bShare) * 1000 : 0;
    rawTenths.push(raw);
    const diffPp = Math.round(raw) / 10;

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

  // Distribute decimal rounding by largest remainder. Never use rounding to
  // conceal a missing workflow or a genuinely inconsistent denominator.
  const rawTotalTenths = rawTenths.reduce((sum, value) => sum + value, 0);
  const targetTenths = Math.round(movementPp * 10);
  if (hasComparator && Math.abs(rawTotalTenths - targetTenths) > 1) {
    throw new Error('Workflow contributions do not reconcile with STEP movement');
  }
  const roundedTenths = contributors.map(c => Math.round(c.movementContributionPp * 10));
  let remainder = targetTenths - roundedTenths.reduce((sum, value) => sum + value, 0);
  const order = rawTenths.map((raw, index) => index).sort((a, b) =>
    remainder >= 0
      ? (rawTenths[b] - roundedTenths[b]) - (rawTenths[a] - roundedTenths[a])
      : (rawTenths[a] - roundedTenths[a]) - (rawTenths[b] - roundedTenths[b])
  );
  for (let index = 0; remainder !== 0 && index < order.length; index++) {
    roundedTenths[order[index]] += Math.sign(remainder);
    remainder -= Math.sign(remainder);
  }
  if (remainder !== 0) throw new Error('Unable to reconcile workflow contribution rounding');
  contributors.forEach((contributor, index) => {
    contributor.movementContributionPp = roundedTenths[index] / 10;
    contributor.direction = roundedTenths[index] > 0 ? 'UP' : roundedTenths[index] < 0 ? 'DOWN' : 'STABLE';
  });
  contributors.sort((a, b) => Math.abs(b.movementContributionPp) - Math.abs(a.movementContributionPp));
  const reconciledMovementPp = roundedTenths.reduce((sum, value) => sum + value, 0) / 10;

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
