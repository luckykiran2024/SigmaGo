import { StepType } from '../analytics/distributions';

export type ClassificationRuleType =
  | 'NUMERIC_THRESHOLD'
  | 'FIELD_MATCH'
  | 'POLICY_BOUNDARY'
  | 'REFERENCE_RELATIONSHIP'
  | 'CUSTOM';

export type ClassificationRuleOperator =
  | '>='
  | '<='
  | '>'
  | '<'
  | '=='
  | '!='
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS';

export interface ClassificationRule {
  id?: string;
  type?: ClassificationRuleType;
  field: string;
  operator: ClassificationRuleOperator;
  value: number | string | boolean;
  breachStepType?: 'EXCEPTION' | 'STRUCTURAL';
  reason?: string;
}

export interface RuleEvaluationResult {
  isBreached: boolean;
  resolvedStepType: StepType;
  classificationSource: 'WORKFLOW' | 'EXCEPTION_RULE' | 'MANUAL_OVERRIDE';
  classificationReason: string | null;
  breachedRule?: ClassificationRule | null;
}

export interface RuleEvaluationParams {
  baseStepType: StepType;
  rulesJson?: any;
  policyBound?: {
    boundField?: string | null;
    boundType?: string | null; // 'MAX' | 'MIN'
    boundValue?: number | null;
    policyTitle?: string | null;
  } | null;
  customFields?: Record<string, any>;
  formDataNumericValues?: Record<string, number>;
  manualOverride?: { isOverride: boolean; reason?: string | null } | null;
  referenceRelationship?: string | null;
}
