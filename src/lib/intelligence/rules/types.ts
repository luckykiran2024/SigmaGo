import { StepType } from '../analytics/distributions';

export type ClassificationRuleType =
  | 'NUMERIC_THRESHOLD'
  | 'FIELD_MATCH'
  | 'POLICY_BOUNDARY'
  | 'REFERENCE_RELATIONSHIP'
  | 'CUSTOM';

export type ClassificationRuleOperator =
  | 'VALUE_MAX'
  | 'VALUE_MIN'
  | 'PERCENTAGE_MAX'
  | 'COUNT_MAX'
  | 'DATE_WINDOW'
  | 'ENUM_ALLOWED'
  | 'CONTAINS'
  | '>='
  | '<='
  | '>'
  | '<'
  | '=='
  | '!='
  | 'EQUALS'
  | 'NOT_EQUALS';

export interface ClassificationRule {
  id?: string;
  version?: number;
  classification_rule_schema_version?: number;
  type?: ClassificationRuleType;
  field: string;
  operator: ClassificationRuleOperator;
  value: number | string | boolean | string[] | any;
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
