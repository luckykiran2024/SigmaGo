import { describe, it, expect } from 'vitest';
import { calculateStepDistribution, StepType } from '@/lib/intelligence/analytics/distributions';
import { resolvePeriodKey, getPeriodDateRange } from '@/lib/intelligence/analytics/periods';

describe('Synthetic Fallbacks Removal & Real Historical Range Verification', () => {
  it('1. Returns zero shares and no synthetic fallback when current decisions count is zero', () => {
    const zeroCurrentCounts: Record<StepType, number> = {
      STRUCTURAL: 0,
      TRANSACTIONAL: 0,
      EXCEPTION: 0,
      PROCESS: 0,
    };

    const zeroComparatorCounts: Record<StepType, number> = {
      STRUCTURAL: 0,
      TRANSACTIONAL: 0,
      EXCEPTION: 0,
      PROCESS: 0,
    };

    const result = calculateStepDistribution(zeroCurrentCounts, zeroComparatorCounts);

    expect(result.totalCurrentDecisions).toBe(0);
    expect(result.totalComparatorDecisions).toBe(0);

    // Verify no synthetic TRANSACTIONAL=1 injection
    expect(result.steps.TRANSACTIONAL.currentCount).toBe(0);
    expect(result.steps.TRANSACTIONAL.currentShare).toBe(0);
    expect(result.steps.STRUCTURAL.currentShare).toBe(0);
    expect(result.steps.EXCEPTION.currentShare).toBe(0);
    expect(result.steps.PROCESS.currentShare).toBe(0);
  });

  it('2. Does NOT compute historical range if fewer than 3 historical periods exist', () => {
    const currentCounts: Record<StepType, number> = {
      STRUCTURAL: 20,
      TRANSACTIONAL: 50,
      EXCEPTION: 20,
      PROCESS: 10,
    };
    const comparatorCounts: Record<StepType, number> = {
      STRUCTURAL: 15,
      TRANSACTIONAL: 55,
      EXCEPTION: 20,
      PROCESS: 10,
    };

    // Only 2 historical periods
    const twoHistoricalPeriods: Array<Record<StepType, number>> = [
      { STRUCTURAL: 12, TRANSACTIONAL: 58, EXCEPTION: 18, PROCESS: 12 },
      { STRUCTURAL: 14, TRANSACTIONAL: 52, EXCEPTION: 22, PROCESS: 12 },
    ];

    const result = calculateStepDistribution(currentCounts, comparatorCounts, twoHistoricalPeriods);

    expect(result.steps.STRUCTURAL.historicalRange).toBeUndefined();
    expect(result.steps.TRANSACTIONAL.historicalRange).toBeUndefined();
    expect(result.steps.EXCEPTION.historicalRange).toBeUndefined();
    expect(result.steps.PROCESS.historicalRange).toBeUndefined();
  });

  it('3. Computes real historical range when >= 3 historical periods are supplied without synthetic padding', () => {
    const currentCounts: Record<StepType, number> = {
      STRUCTURAL: 20,
      TRANSACTIONAL: 50,
      EXCEPTION: 20,
      PROCESS: 10,
    };
    const comparatorCounts: Record<StepType, number> = {
      STRUCTURAL: 15,
      TRANSACTIONAL: 55,
      EXCEPTION: 20,
      PROCESS: 10,
    };

    // 3 real historical periods
    const threeHistoricalPeriods: Array<Record<StepType, number>> = [
      // Period 1: total = 100 -> STRUCTURAL = 10%
      { STRUCTURAL: 10, TRANSACTIONAL: 60, EXCEPTION: 20, PROCESS: 10 },
      // Period 2: total = 100 -> STRUCTURAL = 15%
      { STRUCTURAL: 15, TRANSACTIONAL: 55, EXCEPTION: 20, PROCESS: 10 },
      // Period 3: total = 100 -> STRUCTURAL = 25%
      { STRUCTURAL: 25, TRANSACTIONAL: 45, EXCEPTION: 20, PROCESS: 10 },
    ];

    const result = calculateStepDistribution(currentCounts, comparatorCounts, threeHistoricalPeriods);

    expect(result.steps.STRUCTURAL.historicalRange).toBeDefined();
    expect(result.steps.STRUCTURAL.historicalRange?.samplePeriodsCount).toBe(3);
    // Min share is 10/100 = 0.10, Max share is 25/100 = 0.25
    expect(result.steps.STRUCTURAL.historicalRange?.minShare).toBe(0.10);
    expect(result.steps.STRUCTURAL.historicalRange?.maxShare).toBe(0.25);
  });
});
