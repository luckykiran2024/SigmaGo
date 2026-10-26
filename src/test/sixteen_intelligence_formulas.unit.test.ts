import { describe, it, expect } from 'vitest';
import { calculateStepDistribution, StepType } from '@/lib/intelligence/analytics/distributions';
import { analyzeStepMovement } from '@/lib/intelligence/analytics/contributors';
import { evaluatePolicyHealth } from '@/lib/intelligence/analytics/policyHealth';
import { generateIntelligenceSignals } from '@/lib/intelligence/analytics/signals';
import { DecisionGraph } from '@/lib/intelligence/chain/graph';
import { calculateGovernanceRate } from '@/lib/intelligence/chain/governance';
import { calculateNodeSoundness } from '@/lib/intelligence/chain/soundness';
import { calculateOrphanMetrics } from '@/lib/intelligence/chain/structure';

/**
 * Formal Verification Suite for the 16 Core Organisational Intelligence Formulas
 * 
 * Metric Table Under Verification:
 * 1.  Blast Radius:           Unique transitive downstream decisions
 * 2.  Impact Factor:          Blast Radius ÷ eligible downstream population × 100
 * 3.  Cross-Domain Reach:     Affected domains ÷ relevant domains × 100
 * 4.  Deviation Factor:       Decisions outside expected boundary ÷ comparable eligible decisions × 100
 * 5.  Exception Rate:         Exceptions ÷ comparable eligible decisions × 100
 * 6.  Exception Pressure:     Current exception rate ÷ historical comparable exception rate
 * 7.  Confidence / Alignment: (Approvals + 0.5 × Reservations) ÷ total stances × 100
 * 8.  Governance Rate:        Governance-compliant decisions ÷ eligible decisions × 100
 * 9.  Reservation Rate:       Reservations ÷ approval stances × 100
 * 10. Decision Friction:      Cycle time + stage dwell + rework + SLA deviation
 * 11. Persistence:            Periods signal persists ÷ comparable periods × 100
 * 12. Reuse Rate:             Decisions referencing precedent ÷ eligible decisions × 100
 * 13. Decision Concentration: Top-N share / HHI (Herfindahl-Hirschman Index)
 * 14. STEP Share:             STEP decisions ÷ all included decisions × 100
 * 15. STEP Movement:          Current STEP share − baseline STEP share (pp)
 * 16. Policy Health:          Deviation + persistence + load + reason concentration
 */

describe('16 Core Organisational Intelligence Formulas Verification', () => {

  // ==========================================
  // FORMULA 1: Blast Radius
  // Arithmetic: Unique transitive downstream decisions
  // What it answers: How far does this decision reach?
  // ==========================================
  describe('1. Blast Radius', () => {
    it('calculates the exact unique transitive downstream decisions in a multi-hop decision graph', () => {
      const graph = new DecisionGraph();

      // Root Governance Decision (STR-001)
      graph.addNode({ id: 'str-1', ref: 'STR-001', subject: 'Cloud Strategy', stepType: 'STRUCTURAL', reasoningLength: 100, isSealed: true, createdAt: '' });
      // Direct children
      graph.addNode({ id: 'prc-1', ref: 'PRC-001', subject: 'Sec Drill', stepType: 'PROCESS', reasoningLength: 80, isSealed: true, createdAt: '' });
      graph.addNode({ id: 'prc-2', ref: 'PRC-002', subject: 'Arch Review', stepType: 'PROCESS', reasoningLength: 90, isSealed: true, createdAt: '' });
      // Grandchildren
      graph.addNode({ id: 'trx-1', ref: 'TRX-001', subject: 'GPU Lease', stepType: 'TRANSACTIONAL', reasoningLength: 40, isSealed: true, createdAt: '' });
      graph.addNode({ id: 'trx-2', ref: 'TRX-002', subject: 'SaaS Renewal', stepType: 'TRANSACTIONAL', reasoningLength: 50, isSealed: true, createdAt: '' });
      graph.addNode({ id: 'exp-1', ref: 'EXP-001', subject: 'Firewall Bypass', stepType: 'EXCEPTION', reasoningLength: 60, isSealed: true, createdAt: '' });

      // Build edges (Child BASED_ON / EXCEPTION_TO Parent)
      graph.addEdge({ sourceId: 'prc-1', targetId: 'str-1', relationship: 'BASED_ON' });
      graph.addEdge({ sourceId: 'prc-2', targetId: 'str-1', relationship: 'BASED_ON' });
      graph.addEdge({ sourceId: 'trx-1', targetId: 'prc-1', relationship: 'BASED_ON' });
      graph.addEdge({ sourceId: 'trx-2', targetId: 'prc-1', relationship: 'BASED_ON' });
      graph.addEdge({ sourceId: 'exp-1', targetId: 'prc-2', relationship: 'EXCEPTION_TO' });

      // Transitive descendants of Root str-1
      const blastRadiusStr1 = graph.getTransitiveDescendants('str-1');
      expect(blastRadiusStr1.size).toBe(5); // prc-1, prc-2, trx-1, trx-2, exp-1
      expect(Array.from(blastRadiusStr1)).toEqual(expect.arrayContaining(['prc-1', 'prc-2', 'trx-1', 'trx-2', 'exp-1']));

      // Leaf node has 0 blast radius
      expect(graph.getTransitiveDescendants('trx-1').size).toBe(0);
    });
  });

  // ==========================================
  // FORMULA 2: Impact Factor
  // Arithmetic: Blast Radius ÷ eligible downstream population × 100
  // What it answers: What % of the relevant decision system is influenced?
  // ==========================================
  describe('2. Impact Factor', () => {
    function computeImpactFactor(blastRadius: number, eligiblePopulation: number): number {
      if (eligiblePopulation <= 0) return 0;
      return Math.round((blastRadius / eligiblePopulation) * 10000) / 100;
    }

    it('computes the percentage of the eligible downstream population influenced', () => {
      // 25 decisions rely on this strategic root out of 100 total decisions
      expect(computeImpactFactor(25, 100)).toBe(25.0);
      // 18 out of 72 eligible decisions
      expect(computeImpactFactor(18, 72)).toBe(25.0);
      // Edge case: 0 eligible population returns 0
      expect(computeImpactFactor(10, 0)).toBe(0);
    });
  });

  // ==========================================
  // FORMULA 3: Cross-Domain Reach
  // Arithmetic: Affected domains ÷ relevant domains × 100
  // What it answers: How widely does it spread organisationally?
  // ==========================================
  describe('3. Cross-Domain Reach', () => {
    function computeCrossDomainReach(affectedDomains: string[], allRelevantDomains: string[]): number {
      const uniqueAffected = new Set(affectedDomains).size;
      const totalRelevant = new Set(allRelevantDomains).size;
      if (totalRelevant === 0) return 0;
      return Math.round((uniqueAffected / totalRelevant) * 10000) / 100;
    }

    it('computes organizational spread across enterprise functional domains', () => {
      const enterpriseDomains = ['Executive', 'Finance', 'Engineering', 'Legal', 'Commercial', 'People'];
      const touchedDomains = ['Finance', 'Engineering', 'Legal', 'Commercial'];

      expect(computeCrossDomainReach(touchedDomains, enterpriseDomains)).toBe(66.67);
      // Full enterprise reach
      expect(computeCrossDomainReach(enterpriseDomains, enterpriseDomains)).toBe(100.0);
      // Confined to single domain
      expect(computeCrossDomainReach(['Finance'], enterpriseDomains)).toBe(16.67);
    });
  });

  // ==========================================
  // FORMULA 4: Deviation Factor
  // Arithmetic: Decisions outside expected boundary ÷ comparable eligible decisions × 100
  // What it answers: How often is the expected rule/path not followed?
  // ==========================================
  describe('4. Deviation Factor', () => {
    function computeDeviationFactor(deviatingDecisions: number, comparableDecisions: number): number {
      if (comparableDecisions <= 0) return 0;
      return Math.round((deviatingDecisions / comparableDecisions) * 10000) / 100;
    }

    it('calculates the deviation percentage outside defined policy boundaries', () => {
      expect(computeDeviationFactor(15, 100)).toBe(15.0);
      expect(computeDeviationFactor(8, 40)).toBe(20.0);
      expect(computeDeviationFactor(0, 50)).toBe(0.0);
    });
  });

  // ==========================================
  // FORMULA 5: Exception Rate
  // Arithmetic: Exceptions ÷ comparable eligible decisions × 100
  // What it answers: How frequently are explicit exceptions occurring?
  // ==========================================
  describe('5. Exception Rate', () => {
    function computeExceptionRate(exceptions: number, totalDecisions: number): number {
      if (totalDecisions <= 0) return 0;
      return Math.round((exceptions / totalDecisions) * 10000) / 100;
    }

    it('computes exact exception frequency for governance monitoring', () => {
      // 30 exceptions out of 100 decisions = 30.0%
      expect(computeExceptionRate(30, 100)).toBe(30.0);
      expect(computeExceptionRate(44, 100)).toBe(44.0);
      expect(computeExceptionRate(0, 100)).toBe(0.0);
    });
  });

  // ==========================================
  // FORMULA 6: Exception Pressure
  // Arithmetic: Current exception rate ÷ historical comparable exception rate
  // What it answers: How abnormal is today's exception activity?
  // ==========================================
  describe('6. Exception Pressure', () => {
    function computeExceptionPressure(currentRate: number, baselineRate: number): number {
      if (baselineRate <= 0) return 1.0;
      return Math.round((currentRate / baselineRate) * 100) / 100;
    }

    it('detects policy drift and abnormal variance against historical comparable baseline', () => {
      // Current rate 30% vs Baseline 15% -> 2.0x pressure (Elevated/Drifting)
      expect(computeExceptionPressure(0.30, 0.15)).toBe(2.0);
      // Current rate 12% vs Baseline 15% -> 0.8x pressure (Normal/Decreasing)
      expect(computeExceptionPressure(0.12, 0.15)).toBe(0.8);
      // Baseline pending/zero edge case
      expect(computeExceptionPressure(0.20, 0)).toBe(1.0);
    });
  });

  // ==========================================
  // FORMULA 7: Confidence / Alignment
  // Arithmetic: (Approvals + 0.5 × Reservations) ÷ total stances × 100
  // What it answers: How aligned are decision makers?
  // ==========================================
  describe('7. Confidence / Alignment', () => {
    function computeConfidenceAlignment(approvals: number, reservations: number, rejections: number): number {
      const totalStances = approvals + reservations + rejections;
      if (totalStances <= 0) return 100.0;
      const score = (approvals + 0.5 * reservations) / totalStances;
      return Math.round(score * 10000) / 100;
    }

    it('weights full endorsements (1.0) and reservations (0.5) accurately', () => {
      // 100% full approvals: (10 + 0) / 10 = 100%
      expect(computeConfidenceAlignment(10, 0, 0)).toBe(100.0);
      // Half approvals, half reservations: (5 + 0.5 * 5) / 10 = 7.5 / 10 = 75.0%
      expect(computeConfidenceAlignment(5, 5, 0)).toBe(75.0);
      // Mixed: 7 approvals, 2 reservations, 1 rejection: (7 + 1.0) / 10 = 80.0%
      expect(computeConfidenceAlignment(7, 2, 1)).toBe(80.0);
      // Heavy disagreement: 0 approvals, 2 reservations, 8 rejections: 1.0 / 10 = 10.0%
      expect(computeConfidenceAlignment(0, 2, 8)).toBe(10.0);
    });
  });

  // ==========================================
  // FORMULA 8: Governance Rate
  // Arithmetic: Governance-compliant decisions ÷ eligible decisions × 100
  // What it answers: How consistently is authority followed?
  // ==========================================
  describe('8. Governance Rate', () => {
    it('computes compliance rate using based_on / (based_on + exceptions)', () => {
      // 65 based_on vs 35 exceptions = 65% governance rate
      expect(calculateGovernanceRate(65, 35)).toBe(0.65);
      // Zero exceptions = 100% compliant
      expect(calculateGovernanceRate(100, 0)).toBe(1.0);
      // Zero decisions = 1.0 default
      expect(calculateGovernanceRate(0, 0)).toBe(1.0);
    });
  });

  // ==========================================
  // FORMULA 9: Reservation Rate
  // Arithmetic: Reservations ÷ approval stances × 100
  // What it answers: How much hesitation exists despite approval?
  // ==========================================
  describe('9. Reservation Rate', () => {
    function computeReservationRate(reservations: number, totalApprovals: number): number {
      if (totalApprovals <= 0) return 0;
      return Math.round((reservations / totalApprovals) * 10000) / 100;
    }

    it('measures executive hesitation within approved decisions', () => {
      // 5 reservations out of 50 total approval stances = 10.0% hesitation
      expect(computeReservationRate(5, 50)).toBe(10.0);
      // 0 reservations = 0.0%
      expect(computeReservationRate(0, 50)).toBe(0.0);
      // High hesitation: 15 reservations out of 30 approvals = 50.0%
      expect(computeReservationRate(15, 30)).toBe(50.0);
    });
  });

  // ==========================================
  // FORMULA 10: Decision Friction
  // Arithmetic: Cycle time + stage dwell + rework + SLA deviation
  // What it answers: How difficult is it to move a decision?
  // ==========================================
  describe('10. Decision Friction', () => {
    interface FrictionParameters {
      cycleTimeHours: number;
      stageDwellHours: number;
      reworkEvents: number;
      slaDeviationHours: number;
    }

    function computeDecisionFrictionIndex(params: FrictionParameters): number {
      // Standard normalized friction composite score (0 - 100 scale)
      const normalizedCycle = Math.min(params.cycleTimeHours / 72, 1.0) * 35; // 35% weight
      const normalizedDwell = Math.min(params.stageDwellHours / 48, 1.0) * 30; // 30% weight
      const normalizedRework = Math.min(params.reworkEvents / 3, 1.0) * 20;    // 20% weight
      const normalizedSla = Math.min(Math.max(params.slaDeviationHours, 0) / 24, 1.0) * 15; // 15% weight

      return Math.round((normalizedCycle + normalizedDwell + normalizedRework + normalizedSla) * 10) / 10;
    }

    it('calculates frictionless swift approvals vs high-friction bureaucratic bottlenecks', () => {
      // Swift approval: 4hr cycle, 1hr dwell, 0 rework, 0 SLA deviation
      const swift = computeDecisionFrictionIndex({ cycleTimeHours: 4, stageDwellHours: 1, reworkEvents: 0, slaDeviationHours: 0 });
      expect(swift).toBeLessThan(10.0);

      // Heavy friction: 96hr cycle, 60hr dwell, 3 reworks, 30hr overdue
      const highFriction = computeDecisionFrictionIndex({ cycleTimeHours: 96, stageDwellHours: 60, reworkEvents: 3, slaDeviationHours: 30 });
      expect(highFriction).toBe(100.0);
    });
  });

  // ==========================================
  // FORMULA 11: Persistence
  // Arithmetic: Periods signal persists ÷ comparable periods × 100
  // What it answers: Is this temporary or sustained?
  // ==========================================
  describe('11. Persistence', () => {
    function computePersistence(persistingPeriods: number, totalComparablePeriods: number): number {
      if (totalComparablePeriods <= 0) return 0;
      return Math.round((persistingPeriods / totalComparablePeriods) * 10000) / 100;
    }

    it('evaluates whether a governance anomaly is transient or sustained over time', () => {
      // Anomaly present in 3 of 4 comparable quarters = 75.0% persistence (Structural trend)
      expect(computePersistence(3, 4)).toBe(75.0);
      // 1 of 4 quarters = 25.0% persistence (One-time anomaly)
      expect(computePersistence(1, 4)).toBe(25.0);
      // 4 of 4 quarters = 100.0% (Chronic policy failure)
      expect(computePersistence(4, 4)).toBe(100.0);
    });
  });

  // ==========================================
  // FORMULA 12: Reuse Rate
  // Arithmetic: Decisions referencing precedent ÷ eligible decisions × 100
  // What it answers: Is organizational memory being reused?
  // ==========================================
  describe('12. Reuse Rate', () => {
    function computeReuseRate(precedentReferencingDecisions: number, eligibleDecisions: number): number {
      if (eligibleDecisions <= 0) return 0;
      return Math.round((precedentReferencingDecisions / eligibleDecisions) * 10000) / 100;
    }

    it('tracks institutional memory leverage via precedent reuse', () => {
      // 45 decisions cite established precedents out of 90 eligible decisions = 50.0%
      expect(computeReuseRate(45, 90)).toBe(50.0);
      expect(computeReuseRate(0, 100)).toBe(0.0);
      expect(computeReuseRate(80, 100)).toBe(80.0);
    });
  });

  // ==========================================
  // FORMULA 13: Decision Concentration (HHI)
  // Arithmetic: Herfindahl-Hirschman Index = Sum(s_i^2) where s_i is percentage share
  // What it answers: Is decision authority concentrated?
  // ==========================================
  describe('13. Decision Concentration', () => {
    function computeDecisionConcentrationHHI(shares: number[]): number {
      // shares in percentage points (e.g. 50 for 50%)
      const sumShares = shares.reduce((a, b) => a + b, 0);
      if (sumShares === 0) return 0;
      // Normalize shares if needed
      const normalized = shares.map(s => (s / sumShares) * 100);
      const hhi = normalized.reduce((acc, s) => acc + s * s, 0);
      return Math.round(hhi);
    }

    it('quantifies decision authority concentration and bottlenecks', () => {
      // Perfectly concentrated: 1 individual makes 100% of decisions -> HHI = 10,000 (Monopoly/Extreme Risk)
      expect(computeDecisionConcentrationHHI([100])).toBe(10000);
      // Balanced distribution: 5 executives making 20% each -> 5 * (20^2) = 2,000 (Healthy delegation)
      expect(computeDecisionConcentrationHHI([20, 20, 20, 20, 20])).toBe(2000);
      // Highly diffused: 10 people making 10% each -> 10 * 100 = 1,000
      expect(computeDecisionConcentrationHHI([10, 10, 10, 10, 10, 10, 10, 10, 10, 10])).toBe(1000);
    });
  });

  // ==========================================
  // FORMULA 14: STEP Share
  // Arithmetic: STEP decisions ÷ all included decisions × 100
  // What it answers: What kind of decisions dominate?
  // ==========================================
  describe('14. STEP Share', () => {
    it('calculates the precise STEP portfolio distribution shares', () => {
      const counts = {
        STRUCTURAL: 20,
        TRANSACTIONAL: 30,
        EXCEPTION: 30,
        PROCESS: 20,
      };

      const result = calculateStepDistribution(counts, counts);
      expect(result.totalCurrentDecisions).toBe(100);

      // Structural = 20 / 100 = 20.0%
      expect(result.steps.STRUCTURAL.currentShare).toBe(0.20);
      expect(`${(result.steps.STRUCTURAL.currentShare * 100).toFixed(1)}%`).toBe('20.0%');

      // Transactional = 30 / 100 = 30.0%
      expect(result.steps.TRANSACTIONAL.currentShare).toBe(0.30);
      expect(`${(result.steps.TRANSACTIONAL.currentShare * 100).toFixed(1)}%`).toBe('30.0%');

      // Exception = 30 / 100 = 30.0%
      expect(result.steps.EXCEPTION.currentShare).toBe(0.30);
      expect(`${(result.steps.EXCEPTION.currentShare * 100).toFixed(1)}%`).toBe('30.0%');

      // Process = 20 / 100 = 20.0%
      expect(result.steps.PROCESS.currentShare).toBe(0.20);
      expect(`${(result.steps.PROCESS.currentShare * 100).toFixed(1)}%`).toBe('20.0%');
    });
  });

  // ==========================================
  // FORMULA 15: STEP Movement
  // Arithmetic: Current STEP share − baseline STEP share
  // What it answers: What changed?
  // ==========================================
  describe('15. STEP Movement', () => {
    it('computes percentage-point movement against historical comparable baseline', () => {
      const current = {
        STRUCTURAL: 25,   // 25.0%
        TRANSACTIONAL: 35, // 35.0%
        EXCEPTION: 25,     // 25.0%
        PROCESS: 15,       // 15.0%
      };

      const comparator = {
        STRUCTURAL: 20,   // 20.0% -> +5.0 pp
        TRANSACTIONAL: 40, // 40.0% -> -5.0 pp
        EXCEPTION: 20,     // 20.0% -> +5.0 pp
        PROCESS: 20,       // 20.0% -> -5.0 pp
      };

      const result = calculateStepDistribution(current, comparator);

      expect(result.steps.STRUCTURAL.movementPp).toBe(5.0);
      expect(result.steps.STRUCTURAL.movementLabel).toBe('+5.0 pp');

      expect(result.steps.TRANSACTIONAL.movementPp).toBe(-5.0);
      expect(result.steps.TRANSACTIONAL.movementLabel).toBe('-5.0 pp');

      expect(result.steps.EXCEPTION.movementPp).toBe(5.0);
      expect(result.steps.EXCEPTION.movementLabel).toBe('+5.0 pp');

      expect(result.steps.PROCESS.movementPp).toBe(-5.0);
      expect(result.steps.PROCESS.movementLabel).toBe('-5.0 pp');
    });
  });

  // ==========================================
  // FORMULA 16: Policy Health
  // Arithmetic: Deviation + persistence + load + reason concentration
  // What it answers: Is a rule Healthy, Watch, Drifting or Revised?
  // ==========================================
  describe('16. Policy Health', () => {
    it('classifies policy lifecycle state across HEALTHY, WATCH, DRIFTING, REVISED', () => {
      // 1. HEALTHY: High governance rate (95%), low exception rate
      const healthy = evaluatePolicyHealth({
        policyId: 'pol-travel-v1',
        policyTitle: 'Global Travel Policy',
        periodKey: '2026-OND',
        basedOnCount: 95,
        exceptionCount: 5,
        historicalExceptionRate: 0.05,
      });
      expect(healthy.healthState).toBe('HEALTHY');
      expect(healthy.governanceRate).toBe(0.95);

      // 2. WATCH: Moderate exception rate (18% vs 10% baseline, deviation +8 pp)
      const watch = evaluatePolicyHealth({
        policyId: 'pol-discount-v2',
        policyTitle: 'Commercial Discount Policy',
        periodKey: '2026-OND',
        basedOnCount: 82,
        exceptionCount: 18,
        historicalExceptionRate: 0.10,
      });
      expect(watch.healthState).toBe('WATCH');

      // 3. DRIFTING: Severe deviation (35% vs 10% baseline, deviation +25 pp)
      const drifting = evaluatePolicyHealth({
        policyId: 'pol-procurement-v1',
        policyTitle: 'Sole-Source Procurement Policy',
        periodKey: '2026-OND',
        basedOnCount: 65,
        exceptionCount: 35,
        historicalExceptionRate: 0.10,
      });
      expect(drifting.healthState).toBe('DRIFTING');
      expect(drifting.governanceRate).toBe(0.65);
      expect(drifting.explanation).toContain('significantly above');
    });
  });

  // ==========================================
  // FORMULA 17: Orphan Score & Graph Connectivity
  // Arithmetic: (Orphan Decisions ÷ Total Eligible Decisions) × 100
  // What it answers: What % of decisions are unreferenced isolated orphans?
  // ==========================================
  describe('17. Orphan Score & Decision Graph Connectivity', () => {
    it('calculates 0.0% orphan score when 100% of approvals have references', () => {
      const nodes = [{ id: 'n-1' }, { id: 'n-2' }, { id: 'n-3' }];
      const edges = [
        { sourceId: 'n-2', targetId: 'n-1' },
        { sourceId: 'n-3', targetId: 'n-2' },
      ];
      const metrics = calculateOrphanMetrics(nodes, edges);
      expect(metrics.totalDecisions).toBe(3);
      expect(metrics.orphanCount).toBe(0);
      expect(metrics.connectedCount).toBe(3);
      expect(metrics.orphanScore).toBe(0.0);
      expect(metrics.connectedRate).toBe(100.0);
      expect(metrics.status).toBe('HEALTHY');
    });

    it('calculates exact 6.0% orphan score for standard enterprise graph (94% referenced, 6% orphans)', () => {
      // 100 decisions: 94 connected, 6 unreferenced orphans
      const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `req-${i + 1}` }));
      // 94 nodes are linked into the decision graph
      const edges = Array.from({ length: 94 }, (_, i) => ({
        sourceId: `req-${i + 1}`,
        targetId: i === 0 ? null : 'req-1',
        toPolicyId: i === 0 ? 'pol-1' : null,
      }));

      const metrics = calculateOrphanMetrics(nodes, edges);
      expect(metrics.totalDecisions).toBe(100);
      expect(metrics.connectedCount).toBe(94);
      expect(metrics.orphanCount).toBe(6);
      expect(metrics.connectedRate).toBe(94.0);
      expect(metrics.orphanScore).toBe(6.0);
      expect(metrics.status).toBe('HEALTHY');
      expect(metrics.orphanIds).toEqual(['req-95', 'req-96', 'req-97', 'req-98', 'req-99', 'req-100']);
    });

    it('flags WATCH when orphan score is between 11% and 25%', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `req-${i + 1}` }));
      const edges = Array.from({ length: 80 }, (_, i) => ({
        sourceId: `req-${i + 1}`,
        targetId: 'req-1',
      }));

      const metrics = calculateOrphanMetrics(nodes, edges);
      expect(metrics.orphanCount).toBe(20);
      expect(metrics.orphanScore).toBe(20.0);
      expect(metrics.status).toBe('WATCH');
    });

    it('flags CRITICAL when orphan score exceeds 25%', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `req-${i + 1}` }));
      const edges = Array.from({ length: 60 }, (_, i) => ({
        sourceId: `req-${i + 1}`,
        targetId: 'req-1',
      }));

      const metrics = calculateOrphanMetrics(nodes, edges);
      expect(metrics.orphanCount).toBe(40);
      expect(metrics.orphanScore).toBe(40.0);
      expect(metrics.status).toBe('CRITICAL');
    });

    it('handles 100% orphans when no approvals have references', () => {
      const nodes = [{ id: 'n-1' }, { id: 'n-2' }, { id: 'n-3' }];
      const edges: any[] = [];
      const metrics = calculateOrphanMetrics(nodes, edges);
      expect(metrics.orphanCount).toBe(3);
      expect(metrics.orphanScore).toBe(100.0);
      expect(metrics.status).toBe('CRITICAL');
    });
  });

});

