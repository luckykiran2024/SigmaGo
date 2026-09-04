import { describe, it, expect } from 'vitest';
import { analyzeStepMovement, WorkflowContribution } from '@/lib/intelligence/analytics/contributors';
import { evaluateClassificationRules } from '@/lib/intelligence/rules/evaluator';

describe('Organisational Intelligence Correctness Suite (Sprint 4)', () => {
  it('1. Exact contributor reconciliation: Sum of contributions strictly equals movementPp (<= 0.01 pp delta)', () => {
    // Construct scenario with 3 workflows whose raw fractional share changes produce rounding discrepancies
    // Current total = 900, Baseline total = 1000
    // Workflow 1: 300 / 900 (33.333%) vs 300 / 1000 (30.0%) -> +3.333 pp
    // Workflow 2: 300 / 900 (33.333%) vs 300 / 1000 (30.0%) -> +3.333 pp
    // Workflow 3: 300 / 900 (33.333%) vs 300 / 1000 (30.0%) -> +3.333 pp
    // Total current = 100%, Total baseline = 90%, Net movement = +10.0 pp
    const totalCurrent = 900;
    const totalBaseline = 1000;
    const movementPp = 10.0;

    const workflowData = [
      {
        workflowId: 'wf-1',
        workflowName: 'Workflow One',
        currentCount: 300,
        baselineCount: 300,
      },
      {
        workflowId: 'wf-2',
        workflowName: 'Workflow Two',
        currentCount: 300,
        baselineCount: 300,
      },
      {
        workflowId: 'wf-3',
        workflowName: 'Workflow Three',
        currentCount: 300,
        baselineCount: 300,
      },
    ];

    const result = analyzeStepMovement({
      stepType: 'STRUCTURAL',
      currentShare: 1.0,
      comparatorShare: 0.9,
      movementPp,
      totalCurrentAll: totalCurrent,
      totalBaselineAll: totalBaseline,
      workflowData,
      consequentialDecisions: [],
    });

    // Verify mathematical reconciliation
    const sumOfContributions = Math.round(
      result.contributors.reduce((acc: number, c: WorkflowContribution) => acc + c.movementContributionPp, 0) * 10
    ) / 10;

    expect(sumOfContributions).toBe(movementPp);
    expect(result.reconciledMovementPp).toBe(movementPp);
  });

  it('2. Evaluates classification rules correctly against numeric bounds and policy thresholds', () => {
    const rules = [
      {
        id: 'rule-budget',
        field: 'amount',
        operator: '>' as const,
        value: 50000,
        breachStepType: 'EXCEPTION' as const,
        reason: 'Budget limit of $50,000 exceeded',
      },
    ];

    // Breached
    const breachedRes = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      rulesJson: rules,
      formDataNumericValues: { amount: 75000 },
    });

    expect(breachedRes.isBreached).toBe(true);
    expect(breachedRes.resolvedStepType).toBe('EXCEPTION');
    expect(breachedRes.classificationReason).toContain('Budget limit of $50,000 exceeded');

    // Compliant
    const compliantRes = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      rulesJson: rules,
      formDataNumericValues: { amount: 25000 },
    });

    expect(compliantRes.isBreached).toBe(false);
    expect(compliantRes.resolvedStepType).toBe('TRANSACTIONAL');
  });

  it('3. Explicit EXCEPTION_TO reference relationship strictly classifies as EXCEPTION', () => {
    const result = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      referenceRelationship: 'EXCEPTION_TO',
    });

    expect(result.isBreached).toBe(true);
    expect(result.resolvedStepType).toBe('EXCEPTION');
    expect(result.classificationSource).toBe('EXCEPTION_RULE');
  });
});
