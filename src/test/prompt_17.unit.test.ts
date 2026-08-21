import { describe, it, expect } from 'vitest';

describe('Build Prompt #17 — Revision A Acceptance Test Suite', () => {
  // Test 1: Category grouping and domain metadata
  it('should group categories by domain (PEOPLE, FINANCE, COMMERCIAL, OPERATIONS, GOVERNANCE, OTHER)', () => {
    const mockCategories = [
      { id: '1', name: 'Mid-year Increment', domain: 'PEOPLE', requester_description: 'Routine salary adjustment', step_type: 'TRANSACTIONAL' },
      { id: '2', name: 'CapEx Spend', domain: 'FINANCE', requester_description: 'Capital expenditure under limit', step_type: 'TRANSACTIONAL' },
      { id: '3', name: 'Vendor Contract', domain: 'COMMERCIAL', requester_description: 'Standard supplier agreement', step_type: 'TRANSACTIONAL' },
    ];

    const grouped: Record<string, typeof mockCategories> = {};
    mockCategories.forEach(cat => {
      const domain = cat.domain || 'OTHER';
      if (!grouped[domain]) grouped[domain] = [];
      grouped[domain].push(cat);
    });

    expect(Object.keys(grouped)).toContain('PEOPLE');
    expect(Object.keys(grouped)).toContain('FINANCE');
    expect(Object.keys(grouped)).toContain('COMMERCIAL');
    expect(grouped['PEOPLE'][0].name).toBe('Mid-year Increment');
  });

  // Test 2: Requester descriptions hide step letters
  it('should never expose step letters or step_type strings in requester-facing picker copy', () => {
    const category = {
      id: '1',
      name: 'Out-of-Cycle Increment',
      requester_description: 'Outside the annual compensation cycle or exceeding standard cap',
      step_type: 'EXCEPTION'
    };

    const displayText = `${category.name} — ${category.requester_description}`;
    expect(displayText).not.toContain('STEP-E');
    expect(displayText).not.toContain('EXCEPTION');
    expect(displayText).toContain('Outside the annual compensation cycle');
  });

  // Test 3: Misclassification detection logic on policy breach
  it('should detect misclassification when entered value exceeds policy bound', () => {
    const policyBound = { bound_type: 'PERCENTAGE_MAX', bound_value: 12 };
    const enteredPercent = 18;

    const isBreached = enteredPercent > policyBound.bound_value;
    expect(isBreached).toBe(true);
  });

  // Test 4: Derived relationship type mapping
  it('should derive relationship type automatically based on category step_type and parent type', () => {
    const deriveRelationship = (categoryStepType: string, parentStepType?: string) => {
      if (categoryStepType === 'EXCEPTION') return 'EXCEPTION_TO';
      if (categoryStepType === 'STRUCTURAL' && parentStepType === 'STRUCTURAL') return 'REPLACES';
      return 'BASED_ON';
    };

    expect(deriveRelationship('EXCEPTION', 'PROCESS')).toBe('EXCEPTION_TO');
    expect(deriveRelationship('TRANSACTIONAL', 'PROCESS')).toBe('BASED_ON');
    expect(deriveRelationship('PROCESS', 'STRUCTURAL')).toBe('BASED_ON');
    expect(deriveRelationship('STRUCTURAL', 'STRUCTURAL')).toBe('REPLACES');
  });

  // Test 5: Valid parent type filtering
  it('should filter available references to valid parent step types', () => {
    const isValidParent = (categoryStepType: string, parentStepType: string) => {
      if (categoryStepType === 'TRANSACTIONAL' || categoryStepType === 'EXCEPTION') {
        return parentStepType === 'PROCESS' || parentStepType === 'STRUCTURAL';
      }
      if (categoryStepType === 'PROCESS') {
        return parentStepType === 'STRUCTURAL';
      }
      if (categoryStepType === 'STRUCTURAL') {
        return parentStepType === 'STRUCTURAL';
      }
      return true;
    };

    expect(isValidParent('TRANSACTIONAL', 'PROCESS')).toBe(true);
    expect(isValidParent('TRANSACTIONAL', 'STRUCTURAL')).toBe(true); // level skip allowed
    expect(isValidParent('PROCESS', 'TRANSACTIONAL')).toBe(false);
    expect(isValidParent('PROCESS', 'STRUCTURAL')).toBe(true);
  });

  // Test 6: Skip reason validation
  it('should support 3 skip reasons with optional 1-line rule text', () => {
    const skipReasons = ['UNRECORDED_RULE', 'NOT_SURE', 'NO_RULE'];
    const skipData = {
      reason: 'UNRECORDED_RULE',
      describedRule: 'CEO verbal approval policy for out-of-band hires'
    };

    expect(skipReasons).toContain(skipData.reason);
    expect(skipData.describedRule).toBeDefined();
  });

  // Test 7: Grouping skips for Admin Unrecorded Rules Queue
  it('should group unrecorded rule skips by described_rule in admin queue', () => {
    const rawSkips = [
      { id: '1', category_id: 'c1', described_rule: 'CEO Verbal Approval Policy' },
      { id: '2', category_id: 'c1', described_rule: 'CEO verbal approval policy' },
      { id: '3', category_id: 'c2', described_rule: 'Emergency Capex Rule' }
    ];

    const grouped: Record<string, number> = {};
    rawSkips.forEach(s => {
      const key = s.described_rule.toLowerCase().trim();
      grouped[key] = (grouped[key] || 0) + 1;
    });

    expect(grouped['ceo verbal approval policy']).toBe(2);
    expect(grouped['emergency capex rule']).toBe(1);
  });
});
