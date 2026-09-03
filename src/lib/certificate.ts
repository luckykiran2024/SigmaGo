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
    const canonicalPayload = JSON.stringify({
      id: request.id,
      tenantId: request.tenant_id,
      subject: request.subject || '',
      body: request.body_json || {},
      conditions: request.conditions || [],
      customFields: request.custom_fields || {},
      beneficiaryId: request.beneficiary_id || '',
      ownerId: request.owner_id || '',
      version: request.version || 1,
      parentReferenceId: request.parent_reference_id || null,
      workflowId: request.workflow_id || null,
      workflowVersionId: request.workflow_version_id || null,
      baselineStepType: request.baseline_step_type || null,
      resolvedStepType: request.resolved_step_type || null,
      authoritySteps: (steps || []).map((s) => ({
        id: s.id,
        order: s.order_index,
        approver: s.approver_id,
        status: s.status,
        actedAt: s.acted_at,
        stance: s.stance || null,
        outcome: s.outcome || null,
        wasBinding: s.was_binding !== undefined ? s.was_binding : true,
        reservationNote: s.reservation_note || null,
      })),
      decisionReferences: (references || []).map((r) => ({
        id: r.id,
        targetId: r.target_id || null,
        toPolicyId: r.to_policy_id || null,
        relationship: r.relationship,
      })),
      participationRecords: (participants || []).map((p) => ({
        id: p.id,
        email: p.email,
        role: p.role,
        isExternal: p.is_external,
        state: p.state,
        comment: p.comment,
        isAuthoritative: false,
      })),
    });

    const checksum = createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
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
