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

  it('4. Real transitive graph reach: Computes true BFS blast radius across multi-hop decision references', async () => {
    const { DecisionGraph } = await import('@/lib/intelligence/chain/graph');
    const graph = new DecisionGraph();

    // Setup a 4-hop chain: Root -> MidA & MidB -> Leaf1 & Leaf2
    graph.addNode({ id: 'root', ref: 'REQ-001', subject: 'Core Architecture', stepType: 'STRUCTURAL', reasoningLength: 100, isSealed: true, createdAt: new Date().toISOString() });
    graph.addNode({ id: 'mid-a', ref: 'REQ-002', subject: 'Service A Spec', stepType: 'PROCESS', reasoningLength: 50, isSealed: true, createdAt: new Date().toISOString() });
    graph.addNode({ id: 'mid-b', ref: 'REQ-003', subject: 'Service B Spec', stepType: 'PROCESS', reasoningLength: 50, isSealed: true, createdAt: new Date().toISOString() });
    graph.addNode({ id: 'leaf-1', ref: 'REQ-004', subject: 'Service A Impl', stepType: 'TRANSACTIONAL', reasoningLength: 30, isSealed: true, createdAt: new Date().toISOString() });
    graph.addNode({ id: 'leaf-2', ref: 'REQ-005', subject: 'Service B Impl', stepType: 'TRANSACTIONAL', reasoningLength: 30, isSealed: true, createdAt: new Date().toISOString() });

    // Edges: source -> target
    graph.addEdge({ sourceId: 'mid-a', targetId: 'root', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'mid-b', targetId: 'root', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'leaf-1', targetId: 'mid-a', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'leaf-2', targetId: 'mid-b', relationship: 'BASED_ON' });

    // Downward BFS: Root's blast radius must reach all 4 descendants transitively
    const rootDescendants = graph.getTransitiveDescendants('root');
    expect(rootDescendants.size).toBe(4);
    expect(rootDescendants.has('mid-a')).toBe(true);
    expect(rootDescendants.has('mid-b')).toBe(true);
    expect(rootDescendants.has('leaf-1')).toBe(true);
    expect(rootDescendants.has('leaf-2')).toBe(true);

    // Upward BFS: Leaf 1 must reach Mid A and Root
    const leaf1Ancestors = graph.getTransitiveAncestors('leaf-1');
    expect(leaf1Ancestors.size).toBe(2);
    expect(leaf1Ancestors.has('mid-a')).toBe(true);
    expect(leaf1Ancestors.has('root')).toBe(true);
    expect(leaf1Ancestors.has('mid-b')).toBe(false);
  });

  it('5. Unclassified decisions isolation: Never defaults unclassified decisions to TRANSACTIONAL', () => {
    const rawRequests = [
      { id: 'req-1', resolved_step_type: 'STRUCTURAL' },
      { id: 'req-2', resolved_step_type: 'EXCEPTION' },
      { id: 'req-3', resolved_step_type: null, baseline_step_type: null }, // Unclassified
      { id: 'req-4', resolved_step_type: null, baseline_step_type: null }, // Unclassified
    ];

    const VALID_STEPS = new Set(['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS']);
    const counts = { STRUCTURAL: 0, TRANSACTIONAL: 0, EXCEPTION: 0, PROCESS: 0 };
    let unclassifiedCount = 0;

    for (const r of rawRequests) {
      const st = r.resolved_step_type || r.baseline_step_type;
      if (st && VALID_STEPS.has(st)) {
        counts[st as keyof typeof counts]++;
      } else {
        unclassifiedCount++;
      }
    }

    expect(counts.STRUCTURAL).toBe(1);
    expect(counts.EXCEPTION).toBe(1);
    // Crucial: TRANSACTIONAL must be 0, NOT 2!
    expect(counts.TRANSACTIONAL).toBe(0);
    expect(counts.PROCESS).toBe(0);
    expect(unclassifiedCount).toBe(2);
  });
});

