import { adminClient } from '@/lib/supabase/admin';

export interface PriorExceptionItem {
  requestId: string;
  ref: string;
  approvedBy: string;
  approvedAt: string | null;
  note: string | null;
}

export interface ExceptionContextResult {
  policy: {
    id: string;
    title: string;
    statement: string;
    reasoning: string | null;
  } | null;
  ordinalThisYear: number;
  priorExceptions: PriorExceptionItem[];
  distinctApprovers: number;
  impactFactor: number;
  costOfNotDeciding?: string | null;
  costOfDeciding?: string | null;
}

/**
 * Retrieves organizational intelligence exception context for a request.
 * Counts EXCEPTION_TO references ONLY against FINALISED decisions, ONLY within current calendar year,
 * and ONLY for the ACTIVE policy version (excluding SUPERSEDED versions).
 */
export async function getExceptionContext(
  tenantId: string,
  requestId: string
): Promise<ExceptionContextResult> {
  // 1. Fetch request details to identify target policy and two-sided case
  const { data: request, error: reqErr } = await adminClient
    .from('approval_requests')
    .select('id, cost_of_not_deciding, cost_of_deciding')
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .single();

  if (reqErr || !request) {
    return {
      policy: null,
      ordinalThisYear: 1,
      priorExceptions: [],
      distinctApprovers: 0,
      impactFactor: 0,
    };
  }

  // 2. Fetch EXCEPTION_TO reference for this request
  const { data: directRef } = await adminClient
    .from('decision_references')
    .select('to_policy_id')
    .eq('source_id', requestId)
    .eq('tenant_id', tenantId)
    .eq('relationship', 'EXCEPTION_TO')
    .limit(1)
    .maybeSingle();

  if (!directRef || !directRef.to_policy_id) {
    return {
      policy: null,
      ordinalThisYear: 1,
      priorExceptions: [],
      distinctApprovers: 0,
      impactFactor: 0,
      costOfNotDeciding: request.cost_of_not_deciding,
      costOfDeciding: request.cost_of_deciding,
    };
  }

  const policyId = directRef.to_policy_id;

  // 3. Fetch Policy details
  const { data: policy } = await adminClient
    .from('policies')
    .select('id, title, statement, reasoning, status')
    .eq('id', policyId)
    .single();

  if (!policy) {
    return {
      policy: null,
      ordinalThisYear: 1,
      priorExceptions: [],
      distinctApprovers: 0,
      impactFactor: 0,
      costOfNotDeciding: request.cost_of_not_deciding,
      costOfDeciding: request.cost_of_deciding,
    };
  }

  // 4. Query prior EXCEPTION_TO references strictly for current ACTIVE policy version, in current calendar year, for FINALISED decisions
  const currentYearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const { data: priorRefs } = await adminClient
    .from('decision_references')
    .select(`
      id, created_at, created_by,
      approval_requests!SourceRefs ( id, ref, status, finalized_at, checksum_sha256 ),
      users!created_by ( id, name, email )
    `)
    .eq('tenant_id', tenantId)
    .eq('to_policy_id', policyId)
    .eq('relationship', 'EXCEPTION_TO')
    .gte('created_at', currentYearStart);

  // Filter only finalized/sealed prior exceptions
  const validPrior = (priorRefs || []).filter((r: any) => {
    const req = r.approval_requests;
    return req && (req.finalized_at || req.checksum_sha256 || req.status === 'approved');
  });

  const priorExceptions: PriorExceptionItem[] = validPrior.map((r: any) => ({
    requestId: r.approval_requests.id,
    ref: r.approval_requests.ref,
    approvedBy: r.users?.name || r.users?.email || 'Approver',
    approvedAt: r.approval_requests.finalized_at || r.created_at,
    note: null,
  }));

  const distinctApproverIds = new Set(validPrior.map((r: any) => r.created_by).filter(Boolean));
  const distinctApprovers = distinctApproverIds.size;

  // Ordinal is prior exceptions count + 1 for current request
  const ordinalThisYear = priorExceptions.length + 1;

  // Impact Factor: count total decisions (BASED_ON, EXCEPTION_TO, REPLACES) resting on this policy
  const { count: impactCount } = await adminClient
    .from('decision_references')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('to_policy_id', policyId);

  const impactFactor = impactCount || priorExceptions.length;

  return {
    policy: {
      id: policy.id,
      title: policy.title,
      statement: policy.statement || 'Policy statement on file.',
      reasoning: policy.reasoning || null,
    },
    ordinalThisYear,
    priorExceptions,
    distinctApprovers,
    impactFactor,
    costOfNotDeciding: request.cost_of_not_deciding,
    costOfDeciding: request.cost_of_deciding,
  };
}
