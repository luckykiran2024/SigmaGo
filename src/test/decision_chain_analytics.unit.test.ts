import { describe, it, expect } from 'vitest';
import { DecisionGraph } from '../lib/intelligence/chain/graph';
import { calculateNodeSoundness, calculateInheritedSoundness } from '../lib/intelligence/chain/soundness';
import { calculateGovernanceRate, calculateExceptionEntropy } from '../lib/intelligence/chain/governance';
import { calculateStructureMetrics } from '../lib/intelligence/chain/structure';

describe('Decision Chain as the Unit of Analysis — Acceptance Test Suite', () => {
  // Test 1: Inherited Soundness Weakest Link Principle
  it('should enforce the weakest link principle where inherited soundness equals the minimum ancestor soundness', () => {
    const graph = new DecisionGraph();

    // Structural Root (Unreasoned parent)
    graph.addNode({
      id: 'root-1',
      ref: 'POL-2024-001',
      subject: 'Competency Framework 2024',
      stepType: 'STRUCTURAL',
      reasoningLength: 5, // Unreasoned -> low soundness
      isSealed: true,
      createdAt: new Date().toISOString(),
    });

    // Transactional Child (Substantive reasoning)
    graph.addNode({
      id: 'child-1',
      ref: 'REQ-2026-0099',
      subject: 'Mid-year Increment Exception',
      stepType: 'TRANSACTIONAL',
      reasoningLength: 150, // Substantive reasoning
      isSealed: true,
      createdAt: new Date().toISOString(),
    });

    graph.addEdge({
      sourceId: 'child-1',
      targetId: 'root-1',
      relationship: 'BASED_ON',
    });

    const rootSoundness = calculateNodeSoundness(graph.nodes.get('root-1')!).score;
    const childSoundness = calculateNodeSoundness(graph.nodes.get('child-1')!).score;

    expect(rootSoundness).toBeLessThan(childSoundness);

    const inherited = calculateInheritedSoundness('child-1', graph);
    expect(inherited.inheritedSoundness).toBe(rootSoundness);
    expect(inherited.weakestLinkNodeId).toBe('root-1');
  });

  // Test 2: Blast Radius (Looking Down)
  it('should calculate blast radius as the number of transitive descendants', () => {
    const graph = new DecisionGraph();

    graph.addNode({ id: 'n1', ref: 'POL-1', subject: 'Policy 1', stepType: 'STRUCTURAL', reasoningLength: 100, isSealed: true, createdAt: '' });
    graph.addNode({ id: 'n2', ref: 'PROC-1', subject: 'Proc 1', stepType: 'PROCESS', reasoningLength: 100, isSealed: true, createdAt: '' });
    graph.addNode({ id: 'n3', ref: 'REQ-1', subject: 'Req 1', stepType: 'TRANSACTIONAL', reasoningLength: 100, isSealed: true, createdAt: '' });
    graph.addNode({ id: 'n4', ref: 'REQ-2', subject: 'Req 2', stepType: 'TRANSACTIONAL', reasoningLength: 100, isSealed: true, createdAt: '' });

    graph.addEdge({ sourceId: 'n2', targetId: 'n1', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'n3', targetId: 'n2', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'n4', targetId: 'n2', relationship: 'BASED_ON' });

    const blastOfPolicy1 = graph.getTransitiveDescendants('n1');
    expect(blastOfPolicy1.size).toBe(3); // n2, n3, n4
  });

  // Test 3: Governance Rate
  it('should compute governance rate as based_on / (based_on + exceptions)', () => {
    expect(calculateGovernanceRate(60, 40)).toBe(0.60);
    expect(calculateGovernanceRate(100, 0)).toBe(1.0);
    expect(calculateGovernanceRate(0, 0)).toBe(1.0);
  });

  // Test 4: Shannon Exception Entropy
  it('should detect systematic gaps vs genuine variation via Shannon Exception Entropy', () => {
    // Dominated gap: 5 exceptions, all 5 for Retention (H < 0.3)
    const singleReasonRes = calculateExceptionEntropy('pol-1', { retention: 5 });
    expect(singleReasonRes.normalizedEntropy).toBe(0);
    expect(singleReasonRes.reading).toBe('DOMINATED_GAP');
    expect(singleReasonRes.actionableRecommendation).toContain('Amend the policy');

    // Genuinely varied: 5 exceptions across 5 different reasons (H > 0.7)
    const variedRes = calculateExceptionEntropy('pol-2', {
      retention: 1,
      equity: 1,
      urgency: 1,
      error: 1,
      other: 1,
    });
    expect(variedRes.normalizedEntropy).toBe(1.0);
    expect(variedRes.reading).toBe('GENUINELY_VARIED');
  });

  // Test 5: Orphan Rate Calculation
  it('should calculate orphan rate as percentage of transactional decisions without valid rule ancestors', () => {
    const graph = new DecisionGraph();

    // Legitimate decision linked to Process rule
    graph.addNode({ id: 'proc-1', ref: 'PROC-1', subject: 'Rule 1', stepType: 'PROCESS', reasoningLength: 100, isSealed: true, createdAt: '' });
    graph.addNode({ id: 't-1', ref: 'REQ-1', subject: 'Legit Req', stepType: 'TRANSACTIONAL', reasoningLength: 100, isSealed: true, createdAt: '' });
    graph.addEdge({ sourceId: 't-1', targetId: 'proc-1', relationship: 'BASED_ON' });

    // Orphan decision with no parent
    graph.addNode({ id: 't-2', ref: 'REQ-2', subject: 'Orphan Req', stepType: 'TRANSACTIONAL', reasoningLength: 100, isSealed: true, createdAt: '' });

    const metrics = calculateStructureMetrics(graph);
    expect(metrics.totalDecisions).toBe(3);
    expect(metrics.transactionalCount).toBe(2);
    expect(metrics.orphanCount).toBe(1);
    expect(metrics.orphanRate).toBe(0.50);
  });
});
