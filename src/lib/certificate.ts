import { createHash } from 'crypto';
import { adminClient } from '@/lib/supabase/admin';

export interface FinalizeResult {
  requestId: string;
  tenantId: string;
  checksum: string;
  finalizedAt: string;
}

/**
 * Calculates a canonical SHA-256 checksum for an approved request payload
 * and records finalized_at and checksum_sha256 in the database.
 */
export async function generateChecksumAndFinalize(
  requestId: string,
  tenantId: string
): Promise<FinalizeResult | null> {
  try {
    // 1. Fetch approval request record
    const { data: request, error: fetchErr } = await adminClient
      .from('approval_requests')
      .select('id, tenant_id, subject, body_json, conditions, custom_fields, beneficiary_id, owner_id, version')
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (fetchErr || !request) {
      console.error(`generateChecksumAndFinalize: Request ${requestId} not found for tenant ${tenantId}`, fetchErr);
      return null;
    }

    // 2. Fetch associated steps for complete audit trail checksum
    const { data: steps } = await adminClient
      .from('approval_steps')
      .select('id, step_order, approver_id, status, acted_at')
      .eq('request_id', requestId)
      .order('step_order', { ascending: true });

    // 3. Compute deterministic canonical payload representation
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
      steps: (steps || []).map(s => ({
        id: s.id,
        order: s.step_order,
        approver: s.approver_id,
        status: s.status,
        actedAt: s.acted_at
      }))
    });

    const checksum = createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
    const finalizedAt = new Date().toISOString();

    // 4. Update approval_requests table in database
    const { error: updateErr } = await adminClient
      .from('approval_requests')
      .update({
        checksum_sha256: checksum,
        finalized_at: finalizedAt
      })
      .eq('id', requestId)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      console.error(`generateChecksumAndFinalize: Failed to update request ${requestId}`, updateErr);
      return null;
    }

    return {
      requestId,
      tenantId,
      checksum,
      finalizedAt
    };
  } catch (err) {
    console.error('generateChecksumAndFinalize error:', err);
    return null;
  }
}

