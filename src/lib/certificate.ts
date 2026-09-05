import { createHash } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';
import { alertSealFailure } from '@/lib/observability/sentry';

export interface FinalizeResult {
  requestId: string;
  tenantId: string;
  checksum: string;
  finalizedAt: string;
}

export interface CertificateAuthorityStep {
  stage: number;
  approverName: string;
  approverEmail: string;
  status: string;
  actedAt?: string | null;
  isAuthoritative: true;
}

export interface CertificateParticipantEntry {
  role: string;
  email: string;
  isExternal: boolean;
  state: string;
  respondedAt?: string | null;
  comment?: string | null;
  isAuthoritative: false;
  disclaimer: 'Non-authoritative';
}

export interface CertificateBlocks {
  authority: CertificateAuthorityStep[];
  participation: CertificateParticipantEntry[];
}

export interface CanonicalAuthorityStepV1 {
  id: string;
  stageIndex: number;
  orderIndex: number;
  approver: string;
  status: string;
  actedAt: string | null;
  stance: string | null;
  outcome: string | null;
  wasBinding: boolean | null;
  reservationNote: string | null;
}

export interface CanonicalAuthorityStepV2 extends CanonicalAuthorityStepV1 {
  comment: string | null;
}

export interface CanonicalDecisionRecordV1 {
  canonicalVersion: 1;
  id: string;
  tenantId: string;
  subject: string | null;
  body: any;
  conditions: any[];
  customFields: any;
  beneficiaryId: string | null;
  ownerId: string | null;
  version: number;
  parentReferenceId: string | null;
  workflowId: string | null;
  workflowVersionId: string | null;
  baselineStepType: string | null;
  resolvedStepType: string | null;
  authoritySteps: CanonicalAuthorityStepV1[];
  decisionReferences: Array<{
    id: string;
    targetId: string | null;
    toPolicyId: string | null;
    relationship: string;
  }>;
  participationRecords: Array<{
    id: string;
    email: string;
    role: string;
    isExternal: boolean;
    state: string;
    respondedAt: string | null;
    comment: string | null;
    isAuthoritative: false;
  }>;
}

export interface CanonicalDecisionRecordV2 {
  canonicalVersion: 2;
  id: string;
  tenantId: string;
  subject: string | null;
  body: any;
  conditions: any[];
  customFields: any;
  beneficiaryId: string | null;
  ownerId: string | null;
  version: number;
  parentReferenceId: string | null;
  workflowId: string | null;
  workflowVersionId: string | null;
  baselineStepType: string | null;
  resolvedStepType: string | null;
  previousSealHash?: string | null;
  authoritySteps: CanonicalAuthorityStepV2[];
  decisionReferences: Array<{
    id: string;
    targetId: string | null;
    toPolicyId: string | null;
    relationship: string;
  }>;
  participationRecords: Array<{
    id: string;
    email: string;
    role: string;
    isExternal: boolean;
    state: string;
    respondedAt: string | null;
    comment: string | null;
    isAuthoritative: false;
  }>;
}

export type CanonicalDecisionRecord = CanonicalDecisionRecordV1 | CanonicalDecisionRecordV2;

/**
 * Normalizes timestamp into a strict ISO-8601 string or null.
 * Rejects undefined, local dates, or inconsistent timestamp representations.
 */
export function normalizeTimestamp(ts: string | Date | null | undefined): string | null {
  if (ts === null || ts === undefined || ts === '') return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Preserves strict null vs empty string ("") semantics.
 * Does not coerce undefined/null into '' or vice-versa.
 */
export function normalizeNullableText(val: any): string | null {
  if (val === null || val === undefined) return null;
  return String(val);
}

/**
 * Strict boolean or null normalization for wasBinding.
 * Never silently defaults historical or missing rows to true.
 */
export function normalizeBinding(val: any): boolean | null {
  if (val === true) return true;
  if (val === false) return false;
  return null;
}

/**
 * Deterministic, recursive lexicographical JSON stringifier.
 * Sorts object keys at all nesting depths. Preserves primitives and null.
 */
export function canonicalizeJson(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'null';
    return Object.is(value, -0) ? '-0' : value.toString();
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => (item === undefined ? 'null' : canonicalizeJson(item)));
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(value[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Single canonical decision serializer for sealing, verification, and certificate rendering.
 * Supports version 1 (legacy without approver comment) and version 2 (with approver comment).
 */
export function buildCanonicalDecisionRecord(params: {
  request: any;
  steps: any[];
  references?: any[];
  participants?: any[];
  version?: 1 | 2;
}): CanonicalDecisionRecord {
  const req = params.request;
  const version = params.version ?? 2;

  // 1. Sort authority steps deterministically by stage_index, order_index, id
  const sortedSteps = [...(params.steps || [])].sort((a, b) => {
    const stageA = a.stage_index ?? a.stageIndex ?? 0;
    const stageB = b.stage_index ?? b.stageIndex ?? 0;
    if (stageA !== stageB) return stageA - stageB;
    const orderA = a.order_index ?? a.orderIndex ?? a.order ?? 0;
    const orderB = b.order_index ?? b.orderIndex ?? b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // 2. Sort decision references deterministically by relationship, target_id, to_policy_id, id
  const sortedReferences = [...(params.references || [])].sort((a, b) => {
    const relA = String(a.relationship || '');
    const relB = String(b.relationship || '');
    if (relA !== relB) return relA.localeCompare(relB);
    const targetA = String(a.target_id || a.targetId || '');
    const targetB = String(b.target_id || b.targetId || '');
    if (targetA !== targetB) return targetA.localeCompare(targetB);
    const polA = String(a.to_policy_id || a.toPolicyId || '');
    const polB = String(b.to_policy_id || b.toPolicyId || '');
    if (polA !== polB) return polA.localeCompare(polB);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // 3. Sort participation records deterministically by role, email, id
  const sortedParticipants = [...(params.participants || [])].sort((a, b) => {
    const roleA = String(a.role || '');
    const roleB = String(b.role || '');
    if (roleA !== roleB) return roleA.localeCompare(roleB);
    const emailA = String(a.email || '');
    const emailB = String(b.email || '');
    if (emailA !== emailB) return emailA.localeCompare(emailB);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  if (version === 1) {
    return {
      canonicalVersion: 1,
      id: req.id,
      tenantId: req.tenant_id || req.tenantId,
      subject: normalizeNullableText(req.subject),
      body: req.body_json || req.body || {},
      conditions: Array.isArray(req.conditions) ? req.conditions : [],
      customFields: req.custom_fields || req.customFields || {},
      beneficiaryId: req.beneficiary_id || req.beneficiaryId || null,
      ownerId: req.owner_id || req.ownerId || null,
      version: req.version || 1,
      parentReferenceId: req.parent_reference_id || req.parentReferenceId || null,
      workflowId: req.workflow_id || req.workflowId || null,
      workflowVersionId: req.workflow_version_id || req.workflowVersionId || null,
      baselineStepType: req.baseline_step_type || req.baselineStepType || null,
      resolvedStepType: req.resolved_step_type || req.resolvedStepType || null,
      authoritySteps: sortedSteps.map((s) => ({
        id: s.id,
        stageIndex: s.stage_index ?? s.stageIndex ?? 0,
        orderIndex: s.order_index ?? s.orderIndex ?? s.order ?? 0,
        approver: s.approver_id || s.approver || '',
        status: s.status,
        actedAt: normalizeTimestamp(s.acted_at || s.actedAt),
        stance: s.stance || null,
        outcome: s.outcome || null,
        wasBinding: normalizeBinding(s.was_binding ?? s.wasBinding),
        reservationNote: normalizeNullableText(s.reservation_note ?? s.reservationNote),
      })),
      decisionReferences: sortedReferences.map((r) => ({
        id: r.id,
        targetId: r.target_id || r.targetId || null,
        toPolicyId: r.to_policy_id || r.toPolicyId || null,
        relationship: r.relationship,
      })),
      participationRecords: sortedParticipants.map((p) => ({
        id: p.id,
        email: p.email,
        role: p.role,
        isExternal: Boolean(p.is_external ?? p.isExternal),
        state: p.state,
        respondedAt: normalizeTimestamp(p.responded_at || p.respondedAt),
        comment: normalizeNullableText(p.comment),
        isAuthoritative: false as const,
      })),
    };
  }

  return {
    canonicalVersion: 2,
    id: req.id,
    tenantId: req.tenant_id || req.tenantId,
    subject: normalizeNullableText(req.subject),
    body: req.body_json || req.body || {},
    conditions: Array.isArray(req.conditions) ? req.conditions : [],
    customFields: req.custom_fields || req.customFields || {},
    beneficiaryId: req.beneficiary_id || req.beneficiaryId || null,
    ownerId: req.owner_id || req.ownerId || null,
    version: req.version || 1,
    parentReferenceId: req.parent_reference_id || req.parentReferenceId || null,
    workflowId: req.workflow_id || req.workflowId || null,
    workflowVersionId: req.workflow_version_id || req.workflowVersionId || null,
    baselineStepType: req.baseline_step_type || req.baselineStepType || null,
    resolvedStepType: req.resolved_step_type || req.resolvedStepType || null,
    ...(req.previous_seal_hash !== undefined || req.previousSealHash !== undefined
      ? { previousSealHash: req.previous_seal_hash || req.previousSealHash || null }
      : {}),
    authoritySteps: sortedSteps.map((s) => ({
      id: s.id,
      stageIndex: s.stage_index ?? s.stageIndex ?? 0,
      orderIndex: s.order_index ?? s.orderIndex ?? s.order ?? 0,
      approver: s.approver_id || s.approver || '',
      status: s.status,
      actedAt: normalizeTimestamp(s.acted_at || s.actedAt),
      stance: s.stance || null,
      outcome: s.outcome || null,
      wasBinding: normalizeBinding(s.was_binding ?? s.wasBinding),
      reservationNote: normalizeNullableText(s.reservation_note ?? s.reservationNote),
      comment: normalizeNullableText(s.comment),
    })),
    decisionReferences: sortedReferences.map((r) => ({
      id: r.id,
      targetId: r.target_id || r.targetId || null,
      toPolicyId: r.to_policy_id || r.toPolicyId || null,
      relationship: r.relationship,
    })),
    participationRecords: sortedParticipants.map((p) => ({
      id: p.id,
      email: p.email,
      role: p.role,
      isExternal: Boolean(p.is_external ?? p.isExternal),
      state: p.state,
      respondedAt: normalizeTimestamp(p.responded_at || p.respondedAt),
      comment: normalizeNullableText(p.comment),
      isAuthoritative: false as const,
    })),
  };
}

/**
 * Computes deterministic SHA-256 hash using recursive lexicographical JSON canonicalization.
 */
export function computeCanonicalSha256(canonicalObject: CanonicalDecisionRecord | any): string {
  const canonicalPayload = canonicalizeJson(canonicalObject);
  return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

/**
 * Authoritative single loader for decision evidence inputs.
 * Used for both seal generation and verification to eliminate schema drift.
 */
export async function loadCanonicalDecisionInputs(requestId: string, tenantId: string) {
  // 1. Fetch approval request record
  const { data: request, error: fetchErr } = await adminClient
    .from('approval_requests')
    .select('id, tenant_id, subject, body_json, conditions, custom_fields, beneficiary_id, owner_id, version, parent_reference_id, workflow_id, workflow_version_id, baseline_step_type, resolved_step_type, checksum_sha256, finalized_at, canonical_version, seal_algorithm, previous_seal_hash, seal_signature_b64, seal_key_id')
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (fetchErr || !request) {
    throw new Error(`Request ${requestId} not found for tenant ${tenantId}`);
  }

  // 2. Fetch steps including approver comments and reasons (fail-closed)
  const { data: steps, error: stepsErr } = await adminClient
    .from('approval_steps')
    .select('id, stage_index, order_index, approver_id, status, acted_at, stance, outcome, was_binding, reservation_note, comment')
    .eq('request_id', requestId)
    .order('order_index', { ascending: true });

  if (stepsErr) {
    throw new Error(`Failed to load authoritative approval steps for request ${requestId}: ${stepsErr.message}`);
  }

  // 3. Fetch decision references strictly within tenant (fail-closed)
  const { data: references, error: refErr } = await adminClient
    .from('decision_references')
    .select('id, target_id, to_policy_id, relationship')
    .eq('source_id', requestId)
    .eq('tenant_id', tenantId);

  if (refErr) {
    throw new Error(`Failed to load decision references for request ${requestId}: ${refErr.message}`);
  }

  // 4. Fetch participants strictly within tenant (fail-closed)
  const { data: participants, error: partErr } = await adminClient
    .from('request_participants')
    .select('id, email, role, is_external, state, responded_at, comment')
    .eq('request_id', requestId)
    .eq('tenant_id', tenantId);

  if (partErr) {
    throw new Error(`Failed to load request participants for request ${requestId}: ${partErr.message}`);
  }

  return {
    request,
    steps: steps || [],
    references: references || [],
    participants: participants || [],
  };
}

/**
 * Calculates a canonical SHA-256 checksum for an approved request payload
 * and persists the cryptographic seal on the request.
 */
export async function generateChecksumAndFinalize(
  requestId: string,
  tenantId: string
): Promise<FinalizeResult | null> {
  try {
    // 1. Resolve previous seal hash in the tenant chain (Append-Only Cryptographic Ledger)
    const { data: previousApproved } = await adminClient
      .from('approval_requests')
      .select('checksum_sha256')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .not('checksum_sha256', 'is', null)
      .neq('id', requestId)
      .order('finalized_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousSealHash =
      previousApproved?.checksum_sha256 ||
      'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

    const inputs = await loadCanonicalDecisionInputs(requestId, tenantId);
    inputs.request.previous_seal_hash = previousSealHash;

    const canonicalRecord = buildCanonicalDecisionRecord({ ...inputs, version: 2 });
    const checksum = computeCanonicalSha256(canonicalRecord);
    const finalizedAt = new Date().toISOString();

    // 2. Generate asymmetric Ed25519 PKI digital signature
    const { signDecisionSeal } = await import('@/lib/crypto/pki');
    const { signatureB64, keyId } = signDecisionSeal(checksum);

    // 3. Invoke authoritative atomic sigmago_finalize_seal RPC
    const { error: rpcErr } = await adminClient.rpc('sigmago_finalize_seal', {
      p_request_id: requestId,
      p_tenant_id: tenantId,
      p_checksum: checksum,
      p_canonical_version: 2,
      p_seal_algorithm: 'SHA-256+Ed25519',
      p_previous_seal_hash: previousSealHash,
      p_seal_signature: signatureB64,
      p_key_id: keyId,
    });

    if (rpcErr) {
      const errMsg = `Authoritative sigmago_finalize_seal RPC failed for request ${requestId}: ${rpcErr.message}. Refusing fallback; request remains in 'FINALIZING'.`;
      console.error(errMsg);
      alertSealFailure(errMsg, { tenantId, requestId });
      throw new Error(errMsg);
    }

    return {
      requestId,
      tenantId,
      checksum,
      finalizedAt,
    };
  } catch (err) {
    console.error('generateChecksumAndFinalize error:', err);
    alertSealFailure(`Exception during seal generation for request ${requestId}: ${err instanceof Error ? err.message : String(err)}`, { tenantId, requestId });
    throw err;
  }
}

/**
 * External cryptographic verification function.
 * Dispatches verification by stored canonical_version (1 vs 2),
 * verifies SHA-256 seal integrity, and validates asymmetric PKI digital signature.
 */
export async function verifyDecisionCertificate(requestId: string, tenantId: string) {
  const inputs = await loadCanonicalDecisionInputs(requestId, tenantId);
  const reqVersion = inputs.request.canonical_version;
  const version: 1 | 2 = reqVersion === 1 ? 1 : 2;

  const canonicalRecord = buildCanonicalDecisionRecord({ ...inputs, version });
  const calculatedChecksum = computeCanonicalSha256(canonicalRecord);
  const storedChecksum = inputs.request.checksum_sha256;

  // Asymmetric PKI signature verification
  let isSignatureValid: boolean | null = null;
  if (inputs.request.seal_signature_b64 && storedChecksum) {
    const { verifyDecisionSignature } = await import('@/lib/crypto/pki');
    isSignatureValid = verifyDecisionSignature(
      storedChecksum,
      inputs.request.seal_signature_b64,
      inputs.request.seal_key_id || undefined
    );
  }

  return {
    isValid: Boolean(storedChecksum && storedChecksum.toLowerCase() === calculatedChecksum.toLowerCase()),
    isSignatureValid,
    canonicalVersion: version,
    storedChecksum,
    calculatedChecksum,
    finalizedAt: inputs.request.finalized_at,
    previousSealHash: inputs.request.previous_seal_hash || null,
    sealSignatureB64: inputs.request.seal_signature_b64 || null,
    sealKeyId: inputs.request.seal_key_id || null,
    canonicalRecord,
  };
}

/**
 * Cryptographically verifies the unbroken tenant append-only hash chain.
 * Proves that no historical approved decision has been retroactively deleted, inserted, or modified.
 */
export async function verifyTenantLedgerChain(tenantId: string): Promise<{
  isChainValid: boolean;
  totalDecisions: number;
  brokenAtDecisionId?: string;
  reason?: string;
}> {
  const { data: requests, error } = await adminClient
    .from('approval_requests')
    .select('id, ref, status, checksum_sha256, previous_seal_hash, finalized_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .not('checksum_sha256', 'is', null)
    .order('finalized_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load tenant decision ledger: ${error.message}`);
  }

  if (!requests || requests.length === 0) {
    return { isChainValid: true, totalDecisions: 0 };
  }

  const GENESIS = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < requests.length; i++) {
    const current = requests[i];
    if (i === 0) {
      if (current.previous_seal_hash && current.previous_seal_hash !== GENESIS) {
        return {
          isChainValid: false,
          totalDecisions: requests.length,
          brokenAtDecisionId: current.id,
          reason: `Genesis decision ${current.ref} has invalid previous_seal_hash: ${current.previous_seal_hash}`,
        };
      }
    } else {
      const prev = requests[i - 1];
      if (current.previous_seal_hash && current.previous_seal_hash !== prev.checksum_sha256) {
        return {
          isChainValid: false,
          totalDecisions: requests.length,
          brokenAtDecisionId: current.id,
          reason: `Ledger link broken at decision ${current.ref}: expected previous hash ${prev.checksum_sha256}, found ${current.previous_seal_hash}`,
        };
      }
    }
  }

  return {
    isChainValid: true,
    totalDecisions: requests.length,
  };
}

/**
 * Returns clearly separated Authority and Participation certificate blocks.
 */
export async function getCertificateBlocks(
  requestId: string,
  tenantId: string
): Promise<CertificateBlocks> {
  const { data: steps, error: stepsErr } = await adminClient
    .from('approval_steps')
    .select('order_index, status, acted_at, users_approval_steps_approver_idTousers(name, email)')
    .eq('request_id', requestId)
    .order('order_index', { ascending: true });

  if (stepsErr) {
    throw new Error(`Failed to load authority steps for request ${requestId}: ${stepsErr.message}`);
  }

  const { data: participants } = await adminClient
    .from('request_participants')
    .select('role, email, is_external, state, responded_at, comment')
    .eq('request_id', requestId)
    .eq('tenant_id', tenantId);

  const authority: CertificateAuthorityStep[] = (steps || []).map((s: any) => ({
    stage: (s.order_index ?? 0) + 1,
    approverName: s.users_approval_steps_approver_idTousers?.name || 'Approver',
    approverEmail: s.users_approval_steps_approver_idTousers?.email || '',
    status: s.status,
    actedAt: s.acted_at,
    isAuthoritative: true,
  }));

  const participation: CertificateParticipantEntry[] = (participants || []).map((p) => ({
    role: p.role,
    email: p.email,
    isExternal: p.is_external,
    state: p.state,
    respondedAt: p.responded_at,
    comment: p.comment,
    isAuthoritative: false,
    disclaimer: 'Non-authoritative',
  }));

  return { authority, participation };
}
