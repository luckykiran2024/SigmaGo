import { describe, it, expect, vi } from 'vitest';
import { evaluateClassificationRules } from '../lib/intelligence/rules/evaluator';
import { ClassificationRule } from '../lib/intelligence/rules/types';
import { runWorkflowPolicyBackfill } from '../../scripts/backfill-workflow-policy-linkage';

describe('Sprint 4: Workflow Truth & Rule Versioning Suite', () => {
  // 1. Classification Rule Schema Versioning
  it('1. Correctly identifies and tags schema_version in rule evaluation results', () => {
    const ruleV1: ClassificationRule = {
      version: 1,
      field: 'requested_salary',
      operator: 'VALUE_MAX',
      value: 2500000,
      breachStepType: 'EXCEPTION',
      reason: 'Salary request exceeds senior director band.',
    };

    const result = evaluateClassificationRules({
      baseStepType: 'STRUCTURAL',
      rulesJson: [ruleV1],
      customFields: { requested_salary: 3000000 },
    });

    expect(result.isBreached).toBe(true);
    expect(result.resolvedStepType).toBe('EXCEPTION');
    expect(result.classificationSource).toBe('EXCEPTION_RULE');
    expect(result.breachedRule?.version).toBe(1);
    expect(result.classificationReason).toContain('exceeds senior director band');
  });

  // 2. Comprehensive Operator Evaluation: VALUE_MAX, VALUE_MIN, PERCENTAGE_MAX, COUNT_MAX
  it('2. Evaluates VALUE_MAX and VALUE_MIN operators correctly', () => {
    // VALUE_MAX breach
    const maxRule: ClassificationRule = {
      field: 'budget_usd',
      operator: 'VALUE_MAX',
      value: 50000,
    };
    const maxResultBreached = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      rulesJson: [maxRule],
      customFields: { budget_usd: 55000 },
    });
    expect(maxResultBreached.isBreached).toBe(true);

    const maxResultPass = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      rulesJson: [maxRule],
      customFields: { budget_usd: 45000 },
    });
    expect(maxResultPass.isBreached).toBe(false);

    // VALUE_MIN breach
    const minRule: ClassificationRule = {
      field: 'notice_days',
      operator: 'VALUE_MIN',
      value: 14,
    };
    const minResultBreached = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      rulesJson: [minRule],
      customFields: { notice_days: 7 },
    });
    expect(minResultBreached.isBreached).toBe(true);

    const minResultPass = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      rulesJson: [minRule],
      customFields: { notice_days: 20 },
    });
    expect(minResultPass.isBreached).toBe(false);
  });

  it('3. Evaluates PERCENTAGE_MAX and COUNT_MAX operators correctly', () => {
    const pctRule: ClassificationRule = {
      field: 'discount_pct',
      operator: 'PERCENTAGE_MAX',
      value: 20,
    };
    expect(
      evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: [pctRule],
        customFields: { discount_pct: 25 },
      }).isBreached
    ).toBe(true);

    const countRule: ClassificationRule = {
      field: 'contract_seats',
      operator: 'COUNT_MAX',
      value: 100,
    };
    expect(
      evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: [countRule],
        customFields: { contract_seats: 105 },
      }).isBreached
    ).toBe(true);
  });

  // 4. ENUM_ALLOWED Operator
  it('4. Evaluates ENUM_ALLOWED operator to enforce white-listed values', () => {
    const enumRule: ClassificationRule = {
      version: 1,
      field: 'deployment_region',
      operator: 'ENUM_ALLOWED',
      value: ['us-east-1', 'us-west-2', 'eu-west-1'],
      breachStepType: 'EXCEPTION',
      reason: 'Deployment region is outside authorized compliant zones.',
    };

    // Compliant region
    const passResult = evaluateClassificationRules({
      baseStepType: 'STRUCTURAL',
      rulesJson: [enumRule],
      customFields: { deployment_region: 'us-east-1' },
    });
    expect(passResult.isBreached).toBe(false);
    expect(passResult.resolvedStepType).toBe('STRUCTURAL');

    // Non-compliant region
    const breachResult = evaluateClassificationRules({
      baseStepType: 'STRUCTURAL',
      rulesJson: [enumRule],
      customFields: { deployment_region: 'ap-southeast-1' },
    });
    expect(breachResult.isBreached).toBe(true);
    expect(breachResult.resolvedStepType).toBe('EXCEPTION');
    expect(breachResult.classificationReason).toContain('outside authorized compliant zones');
  });

  // 5. CONTAINS and Comparison Operators
  it('5. Evaluates CONTAINS and numeric comparison operators', () => {
    const containsRule: ClassificationRule = {
      field: 'contractor_vendor',
      operator: 'CONTAINS',
      value: 'HighRisk',
    };
    expect(
      evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: [containsRule],
        customFields: { contractor_vendor: 'Acme-HighRisk-Services' },
      }).isBreached
    ).toBe(true);

    const gteRule: ClassificationRule = {
      field: 'overtime_hours',
      operator: '>=',
      value: 10,
    };
    expect(
      evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: [gteRule],
        customFields: { overtime_hours: 10 },
      }).isBreached
    ).toBe(true);
  });

  // 6. DATE_WINDOW Operator
  it('6. Evaluates DATE_WINDOW operator correctly', () => {
    const windowRule: ClassificationRule = {
      field: 'effective_date',
      operator: 'DATE_WINDOW',
      value: 15, // Max 15 days in past or future
    };

    // Date 40 days in past -> breached
    const pastDate = new Date(Date.now() - 40 * 86400000).toISOString();
    expect(
      evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: [windowRule],
        customFields: { effective_date: pastDate },
      }).isBreached
    ).toBe(true);

    // Date 5 days in future -> safe
    const nearDate = new Date(Date.now() + 5 * 86400000).toISOString();
    expect(
      evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: [windowRule],
        customFields: { effective_date: nearDate },
      }).isBreached
    ).toBe(false);
  });

  // 7. Policy Boundary & Reference Relationship Precedence
  it('7. Enforces Policy Boundary breach and explicit EXCEPTION_TO relationship', () => {
    // Policy bound breach
    const policyResult = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      policyBound: {
        boundField: 'capital_expenditure',
        boundType: 'MAX',
        boundValue: 100000,
        policyTitle: 'CapEx Policy v2',
      },
      formDataNumericValues: { capital_expenditure: 120000 },
    });
    expect(policyResult.isBreached).toBe(true);
    expect(policyResult.resolvedStepType).toBe('EXCEPTION');
    expect(policyResult.classificationReason).toContain('Breached maximum limit of 100000');

    // EXCEPTION_TO relationship overrides everything
    const refResult = evaluateClassificationRules({
      baseStepType: 'TRANSACTIONAL',
      referenceRelationship: 'EXCEPTION_TO',
    });
    expect(refResult.isBreached).toBe(true);
    expect(refResult.resolvedStepType).toBe('EXCEPTION');
    expect(refResult.classificationReason).toContain('explicit Exception to governing policy');
  });

  // 8. Manual Override Confirmation
  it('8. Permits explicit manual override with logged justification', () => {
    const result = evaluateClassificationRules({
      baseStepType: 'STRUCTURAL',
      manualOverride: {
        isOverride: true,
        reason: 'Authorized executive exemption per board resolution 42.',
      },
    });

    expect(result.isBreached).toBe(false);
    expect(result.resolvedStepType).toBe('STRUCTURAL');
    expect(result.classificationSource).toBe('MANUAL_OVERRIDE');
    expect(result.classificationReason).toBe('Authorized executive exemption per board resolution 42.');
  });

  // 9. Backfill Script Dry-Run Determinism
  it('9. Backfill dry-run correctly reports statistics without mutating records', async () => {
    const stats = await runWorkflowPolicyBackfill(true);
    expect(stats).toBeDefined();
    expect(typeof stats.totalInspected).toBe('number');
    expect(typeof stats.wouldUpdate).toBe('number');
    expect(typeof stats.wouldSkip).toBe('number');
    expect(typeof stats.ambiguous).toBe('number');
    expect(typeof stats.unknown).toBe('number');
    expect(stats.wouldUpdate + stats.wouldSkip + stats.ambiguous + stats.unknown).toBe(stats.totalInspected);
  });
});
