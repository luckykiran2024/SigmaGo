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

export interface CanonicalDecisionRecord {
  id: string;
  tenantId: string;
  subject: string;
  body: any;
  conditions: any[];
  customFields: any;
  beneficiaryId: string | null;
  ownerId: string;
  version: number;
  parentReferenceId: string | null;
  workflowId: string | null;
  workflowVersionId: string | null;
  baselineStepType: string | null;
  resolvedStepType: string | null;
  authoritySteps: Array<{
    id: string;
    order: number;
    approver: string;
    status: string;
    actedAt: string | null;
    stance: string | null;
    outcome: string | null;
    wasBinding: boolean;
    reservationNote: string | null;
  }>;
  decisionReferences: Array<{
    id: string;
    targetId: string | null;
    toPolicyId: string | null;
    relationship: string;
  }>;
  participationRecords?: Array<{
    id: string;
    email: string;
    role: string;
    isExternal: boolean;
    state: string;
    comment?: string | null;
    isAuthoritative: false;
  }>;
}

/**
 * Single canonical serialisation function for sealing, verifying, and certificate rendering.
 * NEVER duplicate this canonical structure.
 */
export function buildCanonicalDecisionRecord(params: {
  request: any;
  steps: any[];
  references?: any[];
  participants?: any[];
}): CanonicalDecisionRecord {
  const req = params.request;
  return {
    id: req.id,
    tenantId: req.tenant_id || req.tenantId,
    subject: req.subject || '',
    body: req.body_json || req.body || {},
    conditions: req.conditions || [],
    customFields: req.custom_fields || req.customFields || {},
    beneficiaryId: req.beneficiary_id || req.beneficiaryId || null,
    ownerId: req.owner_id || req.ownerId || '',
    version: req.version || 1,
    parentReferenceId: req.parent_reference_id || req.parentReferenceId || null,
    workflowId: req.workflow_id || req.workflowId || null,
    workflowVersionId: req.workflow_version_id || req.workflowVersionId || null,
    baselineStepType: req.baseline_step_type || req.baselineStepType || null,
    resolvedStepType: req.resolved_step_type || req.resolvedStepType || null,
    authoritySteps: (params.steps || []).map((s) => ({
      id: s.id,
      order: s.order_index ?? s.order ?? 0,
      approver: s.approver_id || s.approver || '',
      status: s.status,
      actedAt: s.acted_at || s.actedAt || null,
      stance: s.stance || null,
      outcome: s.outcome || null,
      wasBinding: s.was_binding !== undefined ? s.was_binding : s.wasBinding !== undefined ? s.wasBinding : true,
      reservationNote: s.reservation_note || s.reservationNote || null,
    })),
    decisionReferences: (params.references || []).map((r) => ({
      id: r.id,
      targetId: r.target_id || r.targetId || null,
      toPolicyId: r.to_policy_id || r.toPolicyId || null,
      relationship: r.relationship,
    })),
    participationRecords: (params.participants || []).map((p) => ({
      id: p.id,
      email: p.email,
      role: p.role,
      isExternal: Boolean(p.is_external ?? p.isExternal),
      state: p.state,
      comment: p.comment || null,
      isAuthoritative: false as const,
    })),
  };
}

export function computeCanonicalSha256(canonicalObject: CanonicalDecisionRecord | any): string {
  const canonicalPayload = JSON.stringify(canonicalObject);
  return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

/**
 * Calculates a canonical SHA-256 checksum for an approved request payload
 * incorporating both Authority steps and Non-authoritative Participants.
 */
export async function generateChecksumAndFinalize(
  requestId: string,
  tenantId: string
): Promise<FinalizeResult | null> {
  try {
    // 1. Fetch approval request record
    const { data: request, error: fetchErr } = await adminClient
      .from('approval_requests')
      .select('id, tenant_id, subject, body_json, conditions, custom_fields, beneficiary_id, owner_id, version, parent_reference_id, workflow_id, workflow_version_id, baseline_step_type, resolved_step_type')
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (fetchErr || !request) {
      console.error(`generateChecksumAndFinalize: Request ${requestId} not found for tenant ${tenantId}`, fetchErr);
      return null;
    }

    // 2. Fetch associated steps (Authority Chain)
    const { data: steps } = await adminClient
      .from('approval_steps')
      .select('id, order_index, approver_id, status, acted_at, stance, outcome, was_binding, reservation_note')
      .eq('request_id', requestId)
      .order('order_index', { ascending: true });

    // 2b. Fetch associated decision references
    const { data: references } = await adminClient
      .from('decision_references')
      .select('id, target_id, to_policy_id, relationship')
      .eq('source_id', requestId)
      .order('id', { ascending: true });

    // 3. Fetch associated participants (Non-authoritative Participation)
    const { data: participants } = await adminClient
      .from('request_participants')
      .select('id, email, role, is_external, state, responded_at, comment')
      .eq('request_id', requestId);

    // 4. Compute deterministic canonical payload representation
    const canonicalRecord = buildCanonicalDecisionRecord({
      request,
      steps: steps || [],
      references: references || [],
      participants: participants || [],
    });

    const checksum = computeCanonicalSha256(canonicalRecord);
    const finalizedAt = new Date().toISOString();

    // 5. Update approval_requests table in database
    const { error: updateErr } = await adminClient
      .from('approval_requests')
      .update({
        checksum_sha256: checksum,
        finalized_at: finalizedAt,
      })
      .eq('id', requestId)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      console.error(`generateChecksumAndFinalize: Failed to update request ${requestId}`, updateErr);
      alertSealFailure(`Failed to update seal checksum for request ${requestId}: ${updateErr.message}`, { tenantId, requestId });
      return null;
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
    return null;
  }
}

/**
 * Returns clearly separated Authority and Participation certificate blocks.
 */
export async function getCertificateBlocks(
  requestId: string,
  tenantId: string
): Promise<CertificateBlocks> {
  const { data: steps } = await adminClient
    .from('approval_steps')
    .select('order_index, status, acted_at, users_approval_steps_approver_idTousers(name, email)')
    .eq('request_id', requestId)
    .order('order_index', { ascending: true });

  const { data: participants } = await adminClient
    .from('request_participants')
    .select('role, email, is_external, state, responded_at, comment')
    .eq('request_id', requestId);

  const authority: CertificateAuthorityStep[] = (steps || []).map((s: any) => ({
    stage: s.order_index + 1,
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
