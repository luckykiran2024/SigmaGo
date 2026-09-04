/**
 * Server-Authoritative Workflow Classification Rule Engine
 * Evaluates workflow rules and policy bounds server-side to guarantee that
 * classification cannot be bypassed by client manipulation.
 */

export interface ClassificationRule {
  id?: string;
  field: string;
  operator: '>=' | '<=' | '>' | '<' | '==' | '!=' | 'EQUALS' | 'NOT_EQUALS';
  value: number | string | boolean;
  breachStepType?: 'EXCEPTION' | 'STRUCTURAL';
  reason?: string;
}

export interface RuleEvaluationResult {
  isBreached: boolean;
  resolvedStepType: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
  classificationSource: 'WORKFLOW' | 'EXCEPTION_RULE' | 'MANUAL_OVERRIDE';
  classificationReason: string | null;
  breachedRule?: ClassificationRule | null;
}

export function evaluateClassificationRules(params: {
  baseStepType: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
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
}): RuleEvaluationResult {
  const {
    baseStepType,
    rulesJson,
    policyBound,
    customFields = {},
    formDataNumericValues = {},
    manualOverride,
    referenceRelationship,
  } = params;

  // 1. Check explicit reference relationship (e.g. EXCEPTION_TO)
  if (referenceRelationship === 'EXCEPTION_TO') {
    return {
      isBreached: true,
      resolvedStepType: 'EXCEPTION',
      classificationSource: 'EXCEPTION_RULE',
      classificationReason: 'Request initiated as an explicit Exception to governing policy/decision.',
    };
  }

  // Combine custom field values and form numeric values for evaluation
  const allFieldValues: Record<string, any> = { ...customFields, ...formDataNumericValues };

  // 2. Evaluate Governing Policy Boundary (e.g. bound_field, bound_type, bound_value)
  if (policyBound && policyBound.boundField && policyBound.boundValue !== null && policyBound.boundValue !== undefined) {
    const val = allFieldValues[policyBound.boundField];
    const numVal = typeof val === 'number' ? val : parseFloat(String(val));

    if (!isNaN(numVal)) {
      const type = (policyBound.boundType || 'MAX').toUpperCase();
      const bound = Number(policyBound.boundValue);

      if (type === 'MAX' && numVal > bound) {
        return {
          isBreached: true,
          resolvedStepType: 'EXCEPTION',
          classificationSource: 'EXCEPTION_RULE',
          classificationReason: `Breached maximum limit of ${bound} on ${policyBound.boundField} (Entered: ${numVal}) for policy "${policyBound.policyTitle || 'Governing Policy'}"`,
        };
      }

      if (type === 'MIN' && numVal < bound) {
        return {
          isBreached: true,
          resolvedStepType: 'EXCEPTION',
          classificationSource: 'EXCEPTION_RULE',
          classificationReason: `Breached minimum requirement of ${bound} on ${policyBound.boundField} (Entered: ${numVal}) for policy "${policyBound.policyTitle || 'Governing Policy'}"`,
        };
      }
    }
  }

  // 3. Evaluate Workflow-Level Classification Rules (from classification_rules_json)
  let rulesArray: ClassificationRule[] = [];
  if (Array.isArray(rulesJson)) {
    rulesArray = rulesJson;
  } else if (rulesJson && Array.isArray(rulesJson.rules)) {
    rulesArray = rulesJson.rules;
  }

  for (const rule of rulesArray) {
    if (!rule.field) continue;
    const rawVal = allFieldValues[rule.field];
    if (rawVal === undefined || rawVal === null) continue;

    const enteredNum = parseFloat(String(rawVal));
    const targetNum = parseFloat(String(rule.value));
    const isNumericComparison = !isNaN(enteredNum) && !isNaN(targetNum);

    let breached = false;
    switch (rule.operator) {
      case '>':
        breached = isNumericComparison ? enteredNum > targetNum : false;
        break;
      case '>=':
        breached = isNumericComparison ? enteredNum >= targetNum : false;
        break;
      case '<':
        breached = isNumericComparison ? enteredNum < targetNum : false;
        break;
      case '<=':
        breached = isNumericComparison ? enteredNum <= targetNum : false;
        break;
      case '==':
      case 'EQUALS':
        breached = String(rawVal).toLowerCase().trim() === String(rule.value).toLowerCase().trim();
        break;
      case '!=':
      case 'NOT_EQUALS':
        breached = String(rawVal).toLowerCase().trim() !== String(rule.value).toLowerCase().trim();
        break;
    }

    if (breached) {
      return {
        isBreached: true,
        resolvedStepType: rule.breachStepType || 'EXCEPTION',
        classificationSource: 'EXCEPTION_RULE',
        classificationReason: rule.reason || `Breached rule condition: ${rule.field} ${rule.operator} ${rule.value}`,
        breachedRule: rule,
      };
    }
  }

  // 4. Check manual override if no rule breached or if override was logged
  if (manualOverride?.isOverride) {
    return {
      isBreached: false,
      resolvedStepType: baseStepType,
      classificationSource: 'MANUAL_OVERRIDE',
      classificationReason: manualOverride.reason || 'User confirmed choice with logged override rationale',
    };
  }

  // 5. Default: Conforms to workflow base step type
  return {
    isBreached: false,
    resolvedStepType: baseStepType,
    classificationSource: 'WORKFLOW',
    classificationReason: 'Conforms to standard workflow parameters',
  };
}
