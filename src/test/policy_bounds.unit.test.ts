import { describe, it, expect } from 'vitest';
import { evaluatePolicyBound } from '../lib/policies/bounds';

describe('Policy Bounds Evaluator (src/lib/policies/bounds.ts)', () => {
  it('1. Correctly evaluates VALUE_MAX / MAX breaches and passes', () => {
    const bound = {
      boundType: 'VALUE_MAX',
      boundValue: 10000,
      boundField: 'budget_usd',
      policyTitle: 'Capex Governance',
    };

    const breachResult = evaluatePolicyBound(bound, { budget_usd: 15000 });
    expect(breachResult.isBreached).toBe(true);
    expect(breachResult.enteredValue).toBe(15000);
    expect(breachResult.reason).toContain('Breached maximum limit of 10000');

    const passResult = evaluatePolicyBound(bound, { budget_usd: 8000 });
    expect(passResult.isBreached).toBe(false);
  });

  it('2. Correctly evaluates VALUE_MIN / MIN breaches and passes', () => {
    const bound = {
      boundType: 'VALUE_MIN',
      boundValue: 14,
      boundField: 'notice_days',
      policyTitle: 'Vendor Contract Policy',
    };

    const breachResult = evaluatePolicyBound(bound, { notice_days: 7 });
    expect(breachResult.isBreached).toBe(true);
    expect(breachResult.reason).toContain('Breached minimum requirement of 14');

    const passResult = evaluatePolicyBound(bound, { notice_days: 20 });
    expect(passResult.isBreached).toBe(false);
  });

  it('3. Correctly evaluates PERCENTAGE_MAX and COUNT_MAX operators', () => {
    const pctBound = {
      boundType: 'PERCENTAGE_MAX',
      boundValue: 20,
      boundField: 'discount_pct',
      policyTitle: 'Discount Threshold Policy',
    };

    expect(evaluatePolicyBound(pctBound, { discount_pct: 25 }).isBreached).toBe(true);
    expect(evaluatePolicyBound(pctBound, { discount_pct: 15 }).isBreached).toBe(false);

    const countBound = {
      boundType: 'COUNT_MAX',
      boundValue: 50,
      boundField: 'headcount',
      policyTitle: 'Hiring Allocation',
    };

    expect(evaluatePolicyBound(countBound, { headcount: 55 }).isBreached).toBe(true);
    expect(evaluatePolicyBound(countBound, { headcount: 40 }).isBreached).toBe(false);
  });

  it('4. Handles NONE and missing values safely without error', () => {
    const noneBound = {
      boundType: 'NONE',
      boundValue: 100,
      boundField: 'amount',
    };
    expect(evaluatePolicyBound(noneBound, { amount: 200 }).isBreached).toBe(false);

    expect(evaluatePolicyBound(null, { amount: 200 }).isBreached).toBe(false);
    expect(evaluatePolicyBound(undefined, {}).isBreached).toBe(false);
  });
});
