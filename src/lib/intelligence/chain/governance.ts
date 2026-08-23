export interface ExceptionEntropyResult {
  policyId: string;
  exceptionCount: number;
  rawEntropy: number;
  normalizedEntropy: number;
  reading: 'DOMINATED_GAP' | 'MIXED' | 'GENUINELY_VARIED';
  actionableRecommendation: string;
}

/**
 * Calculates Governance Rate of a policy:
 * governance_rate = based_on_children / (based_on_children + exception_children)
 */
export function calculateGovernanceRate(basedOnCount: number, exceptionCount: number): number {
  const total = basedOnCount + exceptionCount;
  if (total === 0) return 1.0;
  return Number((basedOnCount / total).toFixed(2));
}

/**
 * Calculates Shannon Exception Entropy:
 * H = - SUM (p_i * log2(p_i))
 * Normalized H = H / log2(k)
 *
 * Entropy < 0.3 -> One reason dominates -> Amend the policy to cover that gap.
 * Entropy > 0.7 -> Genuinely varied -> Policy is fine; judgment is working.
 */
export function calculateExceptionEntropy(
  policyId: string,
  reasonCounts: Record<string, number>
): ExceptionEntropyResult {
  const categories = Object.keys(reasonCounts);
  const totalExceptions = Object.values(reasonCounts).reduce((acc, c) => acc + c, 0);

  if (totalExceptions === 0 || categories.length === 0) {
    return {
      policyId,
      exceptionCount: 0,
      rawEntropy: 0,
      normalizedEntropy: 0,
      reading: 'GENUINELY_VARIED',
      actionableRecommendation: 'No exceptions recorded. Policy governance is intact.',
    };
  }

  let H = 0;
  for (const count of Object.values(reasonCounts)) {
    if (count > 0) {
      const p = count / totalExceptions;
      H -= p * Math.log2(p);
    }
  }

  const k = categories.length;
  const maxH = k > 1 ? Math.log2(k) : 1;
  const normalizedH = k > 1 ? Number((H / maxH).toFixed(2)) : 0;

  let reading: 'DOMINATED_GAP' | 'MIXED' | 'GENUINELY_VARIED' = 'GENUINELY_VARIED';
  let recommendation = 'Judgment is varied and healthy. Policy is functioning as intended.';

  if (normalizedH < 0.3) {
    reading = 'DOMINATED_GAP';
    recommendation = 'One exception reason dominates. Amend the policy to formally cover this case.';
  } else if (normalizedH <= 0.7) {
    reading = 'MIXED';
    recommendation = 'Mixed exception reasons. Monitor policy compliance.';
  }

  return {
    policyId,
    exceptionCount: totalExceptions,
    rawEntropy: Number(H.toFixed(2)),
    normalizedEntropy: normalizedH,
    reading,
    actionableRecommendation: recommendation,
  };
}
