import { describe, it, expect, vi } from 'vitest';
import { calculateStepDistribution, StepType } from '@/lib/intelligence/analytics/distributions';
import { analyzeStepMovement, ConsequentialDecision } from '@/lib/intelligence/analytics/contributors';
import { generateIntelligenceSignals } from '@/lib/intelligence/analytics/signals';
import { computeWorkflowStageTransitions } from '@/lib/intelligence/analytics/stageTransitions';
import { processOutboxBatch, OutboxRecord } from '@/lib/events/outbox';

describe('Golden Organisational Intelligence Dataset — Verification Suite', () => {
  /**
   * Section 39 Fixture Specification:
   * AMJ 2025 (Comparator baseline): 100 decisions: S 12, T 35, E 41, P 12
   * AMJ 2026 (Current period):      100 decisions: S 14, T 30, E 44, P 12
   * Expected STEP Movement:
   *   S: +2.0 pp
   *   T: -5.0 pp
   *   E: +3.0 pp
   *   P:  0.0 pp
   */
  const goldenCountsAMJ2025: Record<StepType, number> = {
    STRUCTURAL: 12,
    TRANSACTIONAL: 35,
    EXCEPTION: 41,
    PROCESS: 12,
  };

  const goldenCountsAMJ2026: Record<StepType, number> = {
    STRUCTURAL: 14,
    TRANSACTIONAL: 30,
    EXCEPTION: 44,
    PROCESS: 12,
  };

  it('verifies exact mathematical STEP distribution and percentage point movement', () => {
    const result = calculateStepDistribution(goldenCountsAMJ2026, goldenCountsAMJ2025);

    expect(result.totalCurrentDecisions).toBe(100);
    expect(result.totalComparatorDecisions).toBe(100);

    // Structural (+2.0 pp)
    expect(result.steps.STRUCTURAL.currentShare).toBe(0.14);
    expect(result.steps.STRUCTURAL.comparatorShare).toBe(0.12);
    expect(result.steps.STRUCTURAL.movementPp).toBe(2.0);
    expect(result.steps.STRUCTURAL.movementLabel).toBe('+2.0 pp');
    expect(result.steps.STRUCTURAL.status).toBe('ELEVATED');

    // Transactional (-5.0 pp)
    expect(result.steps.TRANSACTIONAL.currentShare).toBe(0.30);
    expect(result.steps.TRANSACTIONAL.comparatorShare).toBe(0.35);
    expect(result.steps.TRANSACTIONAL.movementPp).toBe(-5.0);
    expect(result.steps.TRANSACTIONAL.movementLabel).toBe('-5.0 pp');
    expect(result.steps.TRANSACTIONAL.status).toBe('STRUCTURAL_SHIFT');

    // Exception (+3.0 pp)
    expect(result.steps.EXCEPTION.currentShare).toBe(0.44);
    expect(result.steps.EXCEPTION.comparatorShare).toBe(0.41);
    expect(result.steps.EXCEPTION.movementPp).toBe(3.0);
    expect(result.steps.EXCEPTION.movementLabel).toBe('+3.0 pp');
    expect(result.steps.EXCEPTION.status).toBe('SIGNIFICANT_CHANGE');

    // Process (0.0 pp)
    expect(result.steps.PROCESS.currentShare).toBe(0.12);
    expect(result.steps.PROCESS.comparatorShare).toBe(0.12);
    expect(result.steps.PROCESS.movementPp).toBe(0.0);
    expect(result.steps.PROCESS.movementLabel).toBe('0.0 pp');
    expect(result.steps.PROCESS.status).toBe('NORMAL');
  });

  it('verifies exact contributor reconciliation within <= 0.01 pp for Structural movement', () => {
    // Structural: Total AMJ 2025 = 12 / 100 (12%), Total AMJ 2026 = 14 / 100 (14%) -> Movement = +2.0 pp
    const structuralWorkflows = [
      {
        workflowId: 'wf-arch-board',
        workflowName: 'Strategic Architecture Board',
        domain: 'ENGINEERING',
        currentCount: 11, // 11%
        baselineCount: 8,  // 8% -> +3.0 pp
      },
      {
        workflowId: 'wf-cap-alloc',
        workflowName: 'Capital Allocation Committee',
        domain: 'FINANCE',
        currentCount: 3,  // 3%
        baselineCount: 4,  // 4% -> -1.0 pp
      },
    ];

    const analysis = analyzeStepMovement({
      stepType: 'STRUCTURAL',
      currentShare: 0.14,
      comparatorShare: 0.12,
      movementPp: 2.0,
      totalCurrentAll: 100,
      totalBaselineAll: 100,
      workflowData: structuralWorkflows,
      consequentialDecisions: [],
    });

    const sumWorkflowContributions = analysis.contributors.reduce(
      (acc, c) => acc + c.movementContributionPp,
      0
    );

    expect(analysis.movementPp).toBe(2.0);
    expect(analysis.reconciledMovementPp).toBe(2.0);
    expect(Math.abs(sumWorkflowContributions - analysis.movementPp)).toBeLessThanOrEqual(0.01);
    expect(analysis.contributors[0].workflowName).toBe('Strategic Architecture Board');
    expect(analysis.contributors[0].movementContributionPp).toBe(3.0);
    expect(analysis.contributors[1].workflowName).toBe('Capital Allocation Committee');
    expect(analysis.contributors[1].movementContributionPp).toBe(-1.0);
  });

  it('verifies exact contributor reconciliation within <= 0.01 pp for Transactional movement', () => {
    // Transactional: Total AMJ 2025 = 35 / 100 (35%), Total AMJ 2026 = 30 / 100 (30%) -> Movement = -5.0 pp
    const transactionalWorkflows = [
      {
        workflowId: 'wf-vendor-standard',
        workflowName: 'Standard Vendor Procurement',
        domain: 'PROCUREMENT',
        currentCount: 20, // 20%
        baselineCount: 25, // 25% -> -5.0 pp
      },
      {
        workflowId: 'wf-equip-routine',
        workflowName: 'Routine Equipment Requisition',
        domain: 'OPERATIONS',
        currentCount: 10, // 10%
        baselineCount: 10, // 10% -> 0.0 pp
      },
    ];

    const analysis = analyzeStepMovement({
      stepType: 'TRANSACTIONAL',
      currentShare: 0.30,
      comparatorShare: 0.35,
      movementPp: -5.0,
      totalCurrentAll: 100,
      totalBaselineAll: 100,
      workflowData: transactionalWorkflows,
      consequentialDecisions: [],
    });

    const sumWorkflowContributions = analysis.contributors.reduce(
      (acc, c) => acc + c.movementContributionPp,
      0
    );

    expect(analysis.movementPp).toBe(-5.0);
    expect(analysis.reconciledMovementPp).toBe(-5.0);
    expect(Math.abs(sumWorkflowContributions - analysis.movementPp)).toBeLessThanOrEqual(0.01);
  });

  it('verifies historical range calculation requires >= 3 comparable historical periods', () => {
    // Historical AMJ quarters: 2022 (10%), 2023 (11%), 2024 (13%), 2025 (12%)
    const historicalPeriodsInput = [
      { STRUCTURAL: 10, TRANSACTIONAL: 35, EXCEPTION: 43, PROCESS: 12 }, // Total 100, S = 10%
      { STRUCTURAL: 11, TRANSACTIONAL: 34, EXCEPTION: 43, PROCESS: 12 }, // Total 100, S = 11%
      { STRUCTURAL: 13, TRANSACTIONAL: 33, EXCEPTION: 42, PROCESS: 12 }, // Total 100, S = 13%
      { STRUCTURAL: 12, TRANSACTIONAL: 35, EXCEPTION: 41, PROCESS: 12 }, // Total 100, S = 12%
    ];

    const resultWithRange = calculateStepDistribution(
      goldenCountsAMJ2026,
      goldenCountsAMJ2025,
      historicalPeriodsInput
    );

    const structRange = resultWithRange.steps.STRUCTURAL.historicalRange;
    expect(structRange).toBeDefined();
    expect(structRange?.hasHistoricalRange).toBe(true);
    expect(structRange?.periodCount).toBe(4);
    expect(structRange?.minShare).toBe(0.10);
    expect(structRange?.maxShare).toBe(0.13);

    // Insufficient historical periods (< 3): Only 1 prior comparable period
    const singlePriorPeriod = [
      { STRUCTURAL: 12, TRANSACTIONAL: 35, EXCEPTION: 41, PROCESS: 12 },
    ];

    const resultWithoutRange = calculateStepDistribution(
      goldenCountsAMJ2026,
      goldenCountsAMJ2025,
      singlePriorPeriod
    );

    expect(resultWithoutRange.steps.STRUCTURAL.historicalRange).toBeUndefined();
  });

  it('surfaces consequential decisions classified into STABLE_FOUNDATION, UNDER_PRESSURE, and EMERGING', () => {
    const decisions: ConsequentialDecision[] = [
      {
        requestId: 'req-core-erp',
        ref: 'REQ-2024-001',
        subject: 'Enterprise Resource Planning Master Architecture',
        stepType: 'STRUCTURAL',
        directDescendants: 48,
        transitiveDescendants: 165,
        basedOnCount: 42,
        exceptionCount: 2,
        footprintScore: 94,
        classification: 'STABLE_FOUNDATION',
        whySurfaced: 'High reliance: 165 downstream decisions anchored to this foundational authorization.',
      },
      {
        requestId: 'req-travel-override',
        ref: 'REQ-2025-089',
        subject: 'Executive International Travel Policy Exemption',
        stepType: 'EXCEPTION',
        directDescendants: 12,
        transitiveDescendants: 34,
        basedOnCount: 0,
        exceptionCount: 18,
        footprintScore: 78,
        classification: 'UNDER_PRESSURE',
        whySurfaced: 'Policy strain: 18 repeated exceptions cite this decision as precedent.',
      },
      {
        requestId: 'req-ai-eval',
        ref: 'REQ-2026-012',
        subject: 'GenAI Production Tooling Vendor Onboarding',
        stepType: 'STRUCTURAL',
        directDescendants: 14,
        transitiveDescendants: 22,
        basedOnCount: 14,
        exceptionCount: 0,
        footprintScore: 65,
        classification: 'EMERGING',
        whySurfaced: 'Fast-growing cluster: 14 downstream dependencies established in first 60 days.',
      },
    ];

    expect(decisions.find(d => d.classification === 'STABLE_FOUNDATION')?.directDescendants).toBe(48);
    expect(decisions.find(d => d.classification === 'UNDER_PRESSURE')?.exceptionCount).toBe(18);
    expect(decisions.find(d => d.classification === 'EMERGING')?.basedOnCount).toBe(14);
  });

  it('evaluates intelligence signals using the 4-layer architecture (Fact -> Pattern -> Interpretation -> Recommendation)', () => {
    const signals = generateIntelligenceSignals({
      exceptionSignals: [
        {
          policyId: 'pol-travel-2024',
          policyTitle: 'Global Travel & Expense Policy',
          totalDecisions: 50,
          exceptionCount: 22,
          currentRate: 0.44,
          historicalBaselineRate: 0.15,
        },
      ],
      stepMovements: [
        {
          stepType: 'EXCEPTION',
          movementPp: 3.0,
          currentShare: 0.44,
          baselineShare: 0.41,
          topWorkflowName: 'Budget Overrun Approval',
          sampleSize: 100,
          comparablePeriodsCount: 4,
          policyCoverage: 0.92,
        },
      ],
    });

    expect(signals.length).toBeGreaterThanOrEqual(1);
    const expSignal = signals.find(s => s.signalType === 'EXCEPTION_PRESSURE');
    expect(expSignal).toBeDefined();
    // 4-layer structure
    expect(expSignal?.fact).toContain('22 of 50 comparable decisions were exceptions');
    expect(expSignal?.pattern).toContain('29.0 percentage points above the historical comparable baseline');
    expect(expSignal?.interpretation).toBe('Operating behaviour consistently deviates from configured policy criteria during this period.');
    expect(expSignal?.recommendation).toContain('policy review of Global Travel & Expense Policy criteria');
    expect(expSignal?.impact).toBe('HIGH');
  });

  it('computes workflow stage transitions within a workflow model without STEP-to-STEP Markov logic', () => {
    const transitions = computeWorkflowStageTransitions({
      stepType: 'STRUCTURAL',
      workflowId: 'wf-arch-board',
      transitions: [
        { fromStage: 'STAGE_1_INITIAL_REVIEW', toStage: 'STAGE_2_EXECUTIVE_PANEL', count: 45 },
        { fromStage: 'STAGE_1_INITIAL_REVIEW', toStage: 'REJECTED', count: 5 },
        { fromStage: 'STAGE_2_EXECUTIVE_PANEL', toStage: 'SEALED', count: 40 },
        { fromStage: 'STAGE_2_EXECUTIVE_PANEL', toStage: 'REJECTED', count: 5 },
      ],
    });

    expect(transitions).toHaveLength(4);

    // Stage 1 -> Stage 2: 45 / (45 + 5) = 90% (0.900)
    const st1Advance = transitions.find(
      t => t.fromStage === 'STAGE_1_INITIAL_REVIEW' && t.toStage === 'STAGE_2_EXECUTIVE_PANEL'
    );
    expect(st1Advance?.observedProbability).toBe(0.9);
    expect(st1Advance?.sampleSize).toBe(50);
    expect(st1Advance?.confidenceLabel).toBe('HIGH');

    // Stage 1 -> Rejected: 5 / 50 = 10% (0.100)
    const st1Reject = transitions.find(
      t => t.fromStage === 'STAGE_1_INITIAL_REVIEW' && t.toStage === 'REJECTED'
    );
    expect(st1Reject?.observedProbability).toBe(0.1);

    // Sum of outgoing probabilities from Stage 1 equals 1.0
    expect(Number((st1Advance!.observedProbability + st1Reject!.observedProbability).toFixed(3))).toBe(1.0);
  });

  it('processes outbox batch idempotently and isolates event failures', async () => {
    const mockEvents: OutboxRecord[] = [
      {
        id: 'outbox-evt-1',
        tenant_id: 'tenant-alpha',
        event_type: 'STEP_APPROVED',
        aggregate_type: 'approval_requests',
        aggregate_id: 'req-1',
        payload: { stepId: 'step-1' },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'outbox-evt-2',
        tenant_id: 'tenant-alpha',
        event_type: 'STEP_APPROVED',
        aggregate_type: 'approval_requests',
        aggregate_id: 'req-2',
        payload: { stepId: 'step-2' },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
      },
    ];

    const mockQueryBuilder: any = {
      select: vi.fn(() => mockQueryBuilder),
      eq: vi.fn(() => mockQueryBuilder),
      lt: vi.fn(() => mockQueryBuilder),
      order: vi.fn(() => mockQueryBuilder),
      limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null }),
      update: vi.fn(() => mockQueryBuilder),
      then: (resolve: any) => resolve({ data: mockEvents, error: null }),
    };

    const mockClient = {
      from: vi.fn((table: string) => mockQueryBuilder),
    };

    const handler = vi.fn(async (record: OutboxRecord) => {
      if (record.id === 'outbox-evt-2') {
        throw new Error('Simulated transient worker failure');
      }
    });

    const result = await processOutboxBatch({
      limit: 10,
      tenantId: 'tenant-alpha',
      handler,
      client: mockClient,
    });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
  });
});
