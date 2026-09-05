/**
 * Canonical Policy Bound Evaluator
 * Shared across client UI (RequestForm, MisclassificationBanner) and server-side rules engine.
 * Evaluates whether an entered numeric field value violates a declared policy threshold.
 */

export type BoundType =
  | 'VALUE_MAX'
  | 'VALUE_MIN'
  | 'PERCENTAGE_MAX'
  | 'PERCENTAGE_MIN'
  | 'COUNT_MAX'
  | 'COUNT_MIN'
  | 'MAX'
  | 'MIN'
  | 'NONE';

export interface PolicyBoundDefinition {
  boundType?: string | null;
  boundValue?: number | string | null;
  boundField?: string | null;
  policyTitle?: string | null;
}

export interface BoundEvaluationResult {
  isBreached: boolean;
  boundType: BoundType;
  boundValue: number | null;
  enteredValue: number | null;
  boundField?: string | null;
  reason?: string | null;
}

/**
 * Evaluates whether given field values breach the defined policy bound.
 */
export function evaluatePolicyBound(
  bound: PolicyBoundDefinition | null | undefined,
  fieldValues: Record<string, any>
): BoundEvaluationResult {
  const defaultResult: BoundEvaluationResult = {
    isBreached: false,
    boundType: 'NONE',
    boundValue: null,
    enteredValue: null,
    boundField: bound?.boundField || null,
  };

  if (!bound || !bound.boundType || bound.boundType === 'NONE') {
    return defaultResult;
  }

  const rawBoundValue = Number(bound.boundValue);
  if (isNaN(rawBoundValue)) {
    return defaultResult;
  }

  const normalizedType = bound.boundType.toUpperCase().trim() as BoundType;
  const targetField = bound.boundField;

  // Resolve entered value: from matching field, or first valid positive number
  let enteredValue: number | null = null;
  if (targetField && fieldValues[targetField] !== undefined && fieldValues[targetField] !== null) {
    const parsed = parseFloat(String(fieldValues[targetField]));
    if (!isNaN(parsed)) {
      enteredValue = parsed;
    }
  }

  // Fallback: search all numeric values
  if (enteredValue === null) {
    for (const val of Object.values(fieldValues)) {
      const parsed = parseFloat(String(val));
      if (!isNaN(parsed) && parsed > 0) {
        enteredValue = parsed;
        break;
      }
    }
  }

  if (enteredValue === null) {
    return {
      ...defaultResult,
      boundType: normalizedType,
      boundValue: rawBoundValue,
    };
  }

  let isBreached = false;
  let operatorDescription = '';

  switch (normalizedType) {
    case 'VALUE_MAX':
    case 'MAX':
    case 'PERCENTAGE_MAX':
    case 'COUNT_MAX':
      isBreached = enteredValue > rawBoundValue;
      operatorDescription = 'maximum limit';
      break;

    case 'VALUE_MIN':
    case 'MIN':
    case 'PERCENTAGE_MIN':
    case 'COUNT_MIN':
      isBreached = enteredValue < rawBoundValue;
      operatorDescription = 'minimum requirement';
      break;

    case 'NONE':
    default:
      isBreached = false;
      break;
  }

  const policyName = bound.policyTitle || 'Governing Policy';
  const reason = isBreached
    ? `Breached ${operatorDescription} of ${rawBoundValue}${targetField ? ` on ${targetField}` : ''} (Entered: ${enteredValue}) for policy "${policyName}"`
    : null;

  return {
    isBreached,
    boundType: normalizedType,
    boundValue: rawBoundValue,
    enteredValue,
    boundField: targetField || null,
    reason,
  };
}
