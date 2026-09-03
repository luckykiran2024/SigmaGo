import { describe, it, expect } from 'vitest';
import { resolvePeriodKey, isComparablePeriod } from '../lib/intelligence/analytics/periods';
import { calculateStepDistribution } from '../lib/intelligence/analytics/distributions';
import { analyzeStepMovement } from '../lib/intelligence/analytics/contributors';
import { computeWorkflowStageTransitions } from '../lib/intelligence/analytics/stageTransitions';
import { evaluatePolicyHealth } from '../lib/intelligence/analytics/policyHealth';
import { generateIntelligenceSignals } from '../lib/intelligence/analytics/signals';

describe('Organisational Intelligence Analytics Engine — Acceptance Test Suite', () => {

  // Test 1: Same-Period Prior-Year Comparator Semantics
  it('should enforce same-period prior-year as the mandatory primary comparator', () => {
    // May 15, 2026 -> AMJ 2026
    const date = new Date('2026-05-15T00:00:00.000Z');
    const periodInfo = resolvePeriodKey(date);

    expect(periodInfo.periodKey).toBe('2026-AMJ');
    expect(periodInfo.quarter).toBe('AMJ');
    expect(periodInfo.comparatorPeriodKey).toBe('2025-AMJ'); // Prior year same quarter!
    expect(periodInfo.optionalPriorPeriodKey).toBe('2026-JFM'); // Optional sequential descriptive only

    expect(isComparablePeriod('2026-AMJ', '2025-AMJ')).toBe(true);
    expect(isComparablePeriod('2026-AMJ', '2026-JFM')).toBe(false); // Non-comparable seasonality!
  });

  // Test 2: STEP Distribution & Percentage-Point Movement
  it('should accurately calculate STEP shares and percentage-point movement', () => {
    const currentCounts = {
      STRUCTURAL: 140, // 14.0%
      TRANSACTIONAL: 600, // 60.0%
      EXCEPTION: 160, // 16.0%
      PROCESS: 100, // 10.0%
    };

    const comparatorCounts = {
      STRUCTURAL: 120, // 12.0%
      TRANSACTIONAL: 630, // 63.0%
      EXCEPTION: 150, // 15.0%
      PROCESS: 100, // 10.0%
    };

    const result = calculateStepDistribution(currentCounts, comparatorCounts);

    expect(result.totalCurrentDecisions).toBe(1000);
    expect(result.totalComparatorDecisions).toBe(1000);

    const s = result.steps.STRUCTURAL;
    expect(s.currentShare).toBe(0.14);
    expect(s.comparatorShare).toBe(0.12);
    expect(s.movementPp).toBe(2.0); // +2.0 percentage points!
    expect(s.movementLabel).toBe('+2.0 pp');
  });

  // Test 3: Mathematical Contributor Reconciliation
  it('should mathematically reconcile workflow contributors to the exact STEP tile movement', () => {
    // Current total decisions = 1000, Baseline total decisions = 1000
    // Structural moved +2.0 pp
    const workflowData = [
      {
        workflowId: 'wf-promotions',
        workflowName: 'Executive Role Architecture',
        domain: 'HR',
        currentCount: 80,   // 8.0% of total
        baselineCount: 50,  // 5.0% of total -> +3.0 pp
      },
      {
        workflowId: 'wf-capex',
        workflowName: 'Capital Asset Allocation',
        domain: 'FINANCE',
        currentCount: 60,   // 6.0% of total
        baselineCount: 70,  // 7.0% of total -> -1.0 pp
      },
    ];

    const analysis = analyzeStepMovement({
      stepType: 'STRUCTURAL',
      currentShare: 0.14,
      comparatorShare: 0.12,
      movementPp: 2.0,
      totalCurrentAll: 1000,
      totalBaselineAll: 1000,
      workflowData,
      consequentialDecisions: [
        {
          requestId: 'req-1',
          ref: 'STR-2026-001',
          subject: 'Global Engineering Leveling',
          stepType: 'STRUCTURAL',
          directDescendants: 25,
          transitiveDescendants: 85,
          basedOnCount: 10,
          exceptionCount: 2,
          footprintScore: 92,
          classification: 'STABLE_FOUNDATION',
          whySurfaced: 'High transitive reliance across multiple business units',
        },
      ],
    });

    expect(analysis.contributors).toHaveLength(2);
    expect(analysis.contributors[0].movementContributionPp).toBe(3.0);
    expect(analysis.contributors[1].movementContributionPp).toBe(-1.0);

    // Sum of contributors: +3.0 - 1.0 = +2.0 pp (Reconciled!)
    expect(analysis.reconciledMovementPp).toBe(2.0);
    expect(analysis.topConsequentialDecisions).toHaveLength(1);
    expect(analysis.topConsequentialDecisions[0].ref).toBe('STR-2026-001');
  });

  // Test 4: Workflow Stage Transitions vs Guardrail Rule
  it('should compute causal workflow stage transitions and prevent chronologically fabricated STEP transitions', () => {
    const stageTransitions = computeWorkflowStageTransitions({
      stepType: 'TRANSACTIONAL',
      workflowId: 'wf-promotion-approval',
      transitions: [
        { fromStage: 'START', toStage: 'Stage 0 (Manager)', count: 100 },
        { fromStage: 'Stage 0 (Manager)', toStage: 'Stage 1 (HRBP)', count: 90 },
        { fromStage: 'Stage 0 (Manager)', toStage: 'REJECTED', count: 10 },
        { fromStage: 'Stage 1 (HRBP)', toStage: 'SEALED', count: 85 },
        { fromStage: 'Stage 1 (HRBP)', toStage: 'REJECTED', count: 5 },
      ],
    });

    expect(stageTransitions).toHaveLength(5);
    const startToManager = stageTransitions.find(t => t.fromStage === 'START')!;
    expect(startToManager.observedProbability).toBe(1.0);

    const managerRejections = stageTransitions.find(t => t.fromStage === 'Stage 0 (Manager)' && t.toStage === 'REJECTED')!;
    expect(managerRejections.observedProbability).toBe(0.10); // 10 / 100 = 10%
  });

  // Test 5: Policy Health Evaluation & Longitudinal Transition
  it('should detect policy drift when exception rate rises significantly above historical baseline', () => {
    const health = evaluatePolicyHealth({
      policyId: 'pol-promotions-v3',
      policyTitle: 'Promotion Framework v3',
      periodKey: '2026-AMJ',
      basedOnCount: 65,
      exceptionCount: 35, // 35 / 100 = 35% exception rate
      historicalExceptionRate: 0.15, // Historical baseline was 15% (deviation: +20 pp)
    });

    expect(health.healthState).toBe('DRIFTING');
    expect(health.governanceRate).toBe(0.65);
    expect(health.explanation).toContain('significantly above the historical comparable baseline');
  });

  // Test 6: 4-Layer Fact, Pattern, Interpretation, Recommendation Signal Architecture
  it('should preserve distinct Fact, Pattern, Interpretation, and Recommendation layers in signals', () => {
    const signals = generateIntelligenceSignals({
      exceptionSignals: [
        {
          policyId: 'pol-100',
          policyTitle: 'Equipment Expense Policy',
          totalDecisions: 50,
          exceptionCount: 20, // 40% exception rate
          currentRate: 0.40,
          historicalBaselineRate: 0.15,
        },
      ],
      stepMovements: [
        {
          stepType: 'EXCEPTION',
          movementPp: 2.5,
          currentShare: 0.18,
          baselineShare: 0.155,
          topWorkflowName: 'Mid-Year Compensation Exception',
        },
      ],
    });

    expect(signals).toHaveLength(2);
    const expSignal = signals.find(s => s.signalType === 'EXCEPTION_PRESSURE')!;
    expect(expSignal.fact).toBe('20 of 50 comparable decisions were exceptions under Equipment Expense Policy.');
    expect(expSignal.pattern).toContain('25.0 percentage points above');
    expect(expSignal.interpretation).toBe('Operating behaviour consistently deviates from configured policy criteria during this period.');
    expect(expSignal.recommendation).toContain('Conduct a policy review of Equipment Expense Policy criteria');
    expect(expSignal.impact).toBe('HIGH');
  });
});
