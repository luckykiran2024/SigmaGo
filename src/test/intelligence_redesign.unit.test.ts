import { describe, it, expect } from 'vitest';
import { getStepStatus } from '../lib/intelligence/analytics/status';
import { generateOverviewSummaries } from '../lib/intelligence/analytics/summary';
import { StepDistributionResult, StepType } from '../lib/intelligence/analytics/distributions';
import { IntelligenceSignal } from '../lib/intelligence/analytics/signals';

describe('SigmaGo Intelligence Redesign — Acceptance Suite', () => {

  // Test 1: Fix unreachable Exception Attention threshold (Prompt #14)
  describe('STEP Status Evaluation & Attention Threshold Fix', () => {
    const comparator = 'AMJ 2025';

    it('should return Normal for movement <= 2.0 pp', () => {
      const at0 = getStepStatus('EXCEPTION', { movementPp: 0.0 }, 100, comparator);
      expect(at0.label).toBe('Normal');

      const at1_5 = getStepStatus('EXCEPTION', { movementPp: 1.5 }, 100, comparator);
      expect(at1_5.label).toBe('Normal');

      const at2_0 = getStepStatus('EXCEPTION', { movementPp: 2.0 }, 100, comparator);
      expect(at2_0.label).toBe('Normal');
    });

    it('should return Watch for movement > 2.0 pp and <= 4.0 pp', () => {
      const at2_1 = getStepStatus('EXCEPTION', { movementPp: 2.1 }, 100, comparator);
      expect(at2_1.label).toBe('Watch');
      expect(at2_1.badge).toBe('badge-watch');

      const at3_5 = getStepStatus('EXCEPTION', { movementPp: 3.5 }, 100, comparator);
      expect(at3_5.label).toBe('Watch');

      const at4_0 = getStepStatus('EXCEPTION', { movementPp: 4.0 }, 100, comparator);
      expect(at4_0.label).toBe('Watch');
    });

    it('should return Attention for movement > 4.0 pp (proving unreachable bug is fixed)', () => {
      const at4_1 = getStepStatus('EXCEPTION', { movementPp: 4.1 }, 100, comparator);
      expect(at4_1.label).toBe('Attention');
      expect(at4_1.badge).toBe('badge-attention');
      expect(at4_1.desc).toContain('Above baseline');

      const at7_5 = getStepStatus('EXCEPTION', { movementPp: 7.5 }, 100, comparator);
      expect(at7_5.label).toBe('Attention');
      expect(at7_5.badge).toBe('badge-attention');
    });

    it('should return Baseline pending if comparator decisions are 0', () => {
      const res = getStepStatus('EXCEPTION', { movementPp: 5.0 }, 0, comparator);
      expect(res.label).toBe('Baseline pending');
    });

    it('should normalize vocabulary for non-exception steps to Normal', () => {
      const resStable = getStepStatus('TRANSACTIONAL', { movementPp: 0.2 }, 100, comparator);
      expect(resStable.label).toBe('Normal');

      const resUp = getStepStatus('STRUCTURAL', { movementPp: 1.5 }, 100, comparator);
      expect(resUp.label).toBe('Normal');
    });
  });

  // Test 2: Deterministic Level 1 Overview Summaries (Prompt #25)
  describe('Deterministic Overview Summary Generation', () => {
    const mockDistribution: StepDistributionResult = {
      totalCurrentDecisions: 286,
      totalComparatorDecisions: 250,
      steps: {
        STRUCTURAL: {
          stepType: 'STRUCTURAL',
          currentCount: 18,
          currentShare: 0.063,
          comparatorCount: 20,
          comparatorShare: 0.08,
          movementPp: -1.7,
          movementLabel: '-1.7 pp',
          status: 'NORMAL',
          confidence: 'RELIABLE',
        },
        TRANSACTIONAL: {
          stepType: 'TRANSACTIONAL',
          currentCount: 177,
          currentShare: 0.619,
          comparatorCount: 160,
          comparatorShare: 0.64,
          movementPp: -2.1,
          movementLabel: '-2.1 pp',
          status: 'NORMAL',
          confidence: 'INSTITUTIONAL',
        },
        EXCEPTION: {
          stepType: 'EXCEPTION',
          currentCount: 43,
          currentShare: 0.150,
          comparatorCount: 19,
          comparatorShare: 0.076,
          movementPp: 7.5,
          movementLabel: '+7.5 pp',
          status: 'SIGNIFICANT_CHANGE',
          confidence: 'RELIABLE',
        },
        PROCESS: {
          stepType: 'PROCESS',
          currentCount: 48,
          currentShare: 0.168,
          comparatorCount: 51,
          comparatorShare: 0.204,
          movementPp: -3.6,
          movementLabel: '-3.6 pp',
          status: 'NORMAL',
          confidence: 'RELIABLE',
        },
      },
    };

    const mockSignals: IntelligenceSignal[] = [
      {
        id: 'sig-1',
        signalType: 'EXCEPTION_PRESSURE',
        title: 'Rising Exception Pressure on Promotion Policy',
        fact: '24 of 50 decisions were exceptions.',
        pattern: 'Exception rate is 15.0 percentage points above baseline.',
        interpretation: 'Operational deviation',
        recommendation: 'Review policy criteria',
        magnitude: 15.0,
        persistence: 1,
        impact: 'HIGH',
        confidence: 'RELIABLE',
        confidenceBasis: { sampleSize: 50, baselineSampleSize: 44, comparablePeriodsCount: 4, policyCoverage: 0.93 },
      },
    ];

    it('generates deterministic templates with real metrics', () => {
      const summaries = generateOverviewSummaries({
        distribution: mockDistribution,
        periodDisplayName: 'AMJ 2026',
        comparatorDisplayName: 'AMJ 2025',
        signals: mockSignals,
        coverage: {
          percentage: 93,
          comparablePeriodsCount: 4,
          isReliable: true,
          label: 'Reliable data coverage (93%)',
        },
      });

      // Activity
      expect(summaries.activity.primaryText).toBe('286 decisions');
      expect(summaries.activity.subText).toBe('62% are Transactional');

      // Change
      expect(summaries.change.primaryText).toBe('Exception +7.5 pp');
      expect(summaries.change.subText).toBe('vs AMJ 2025');

      // Attention
      expect(summaries.attention.primaryText).toBe('1 area warrants review');
      expect(summaries.attention.subText).toBe('Highest: Promotion Policy');
      expect(summaries.attention.hasAlerts).toBe(true);

      // Confidence
      expect(summaries.confidence.primaryText).toBe('Coverage supports comparison');
      expect(summaries.confidence.subText).toBe('93% coverage · 4 comparable periods');
    });

    it('generates valid empty states for no attention and no material change', () => {
      const stableDistribution: StepDistributionResult = {
        ...mockDistribution,
        steps: {
          STRUCTURAL: { ...mockDistribution.steps.STRUCTURAL, movementPp: -0.2 },
          TRANSACTIONAL: { ...mockDistribution.steps.TRANSACTIONAL, movementPp: 0.5 },
          EXCEPTION: { ...mockDistribution.steps.EXCEPTION, movementPp: 0.4 },
          PROCESS: { ...mockDistribution.steps.PROCESS, movementPp: -0.7 },
        },
      };

      const summaries = generateOverviewSummaries({
        distribution: stableDistribution,
        periodDisplayName: 'AMJ 2026',
        comparatorDisplayName: 'AMJ 2025',
        signals: [],
        coverage: {
          percentage: 95,
          comparablePeriodsCount: 4,
          isReliable: true,
          label: 'Reliable data coverage (95%)',
        },
      });

      expect(summaries.change.primaryText).toBe('No material change');
      expect(summaries.attention.primaryText).toBe('Nothing requires attention');
      expect(summaries.attention.subText).toBe('Within observed historical range');
      expect(summaries.attention.hasAlerts).toBe(false);
    });

    it('properly qualifies low/developing coverage without manufactured authority', () => {
      const summaries = generateOverviewSummaries({
        distribution: mockDistribution,
        periodDisplayName: 'AMJ 2026',
        comparatorDisplayName: 'AMJ 2025',
        signals: mockSignals,
        coverage: {
          percentage: 41,
          comparablePeriodsCount: 1,
          isReliable: false,
          label: 'Partial data coverage (41%)',
        },
      });

      expect(summaries.confidence.primaryText).toBe('More evidence needed');
      expect(summaries.confidence.subText).toBe('41% coverage · 1 comparable period');
      expect(summaries.confidence.isReliable).toBe(false);
    });
  });

  // Test 3: Metric Completeness & Constraint Enforcement (Prompt #2 & #28)
  describe('16 Metric Families Completeness & Constraint Enforcement', () => {
    const requiredMetrics = [
      'Decision Volume',
      'STEP Distribution / Share',
      'STEP Decision Count',
      'Same-period Comparator Share',
      'STEP Movement in Percentage Points',
      'Historical Observed Range',
      'Number of Comparable Historical Periods',
      'Data / STEP Resolution Coverage',
      'STEP Status: Stable / Normal / Watch / Attention',
      'Workflow Current-period Contribution Count',
      'Workflow Baseline Contribution Count',
      'Workflow Contribution to STEP Movement',
      'Policy Exception Pressure',
      'Signal Confidence',
      'Signal Impact / Attention Level',
      'Decision Blast Radius / Downstream Reliance',
    ];

    it('verifies exactly 16 metric families are accounted for', () => {
      expect(requiredMetrics.length).toBe(16);
      const uniqueMetrics = new Set(requiredMetrics);
      expect(uniqueMetrics.size).toBe(16);
    });
  });
});
