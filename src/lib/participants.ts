import { adminClient } from '@/lib/supabase/admin';

export type ParticipantRole = 'REFERENCE' | 'CONSULTED' | 'INFORMED';
export type ParticipantState = 'PENDING' | 'RESPONDED' | 'DECLINED' | 'NO_RESPONSE';

export interface AddParticipantPayload {
  tenantId: string;
  requestId: string;
  email: string;
  role: ParticipantRole;
  addedById: string;
  reason?: string;
}

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Adds an ad-hoc participant to a request.
 * Participants carry ZERO authority and can NEVER advance a request's approval state.
 */
export async function addRequestParticipant(payload: AddParticipantPayload) {
  const normalizedEmail = normalizeEmail(payload.email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  // 1. Fetch request and category configuration
  const { data: request } = await adminClient
    .from('approval_requests')
    .select('id, category_id, tenant_id, status')
    .eq('id', payload.requestId)
    .eq('tenant_id', payload.tenantId)
    .single();

  if (!request) {
    throw new Error('Approval request not found.');
  }

  const { data: category } = await adminClient
    .from('categories')
    .select('id, allow_participants, allow_external_participants')
    .eq('id', request.category_id)
    .single();

  if (category && category.allow_participants === false) {
    throw new Error('Participants are disabled for this category by configuration.');
  }

  // 2. Check DirectoryPerson status
  const { data: dirPerson } = await adminClient
    .from('directory_persons')
    .select('id, email, status, is_service_account')
    .eq('tenant_id', payload.tenantId)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (dirPerson?.status === 'INACTIVE') {
    throw new Error('Cannot add inactive employees as decision participants.');
  }

  if (dirPerson?.is_service_account) {
    throw new Error('Service accounts cannot be added as participants.');
  }

  const isExternal = !dirPerson;

  // 3. Handle external participant security boundary
  if (isExternal) {
    if (category && category.allow_external_participants === false) {
      throw new Error(
        'External participants are disabled for this decision category by configuration.'
      );
    }
    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new Error('A reason is required when adding external participants.');
    }
  }

  // 4. Create request_participant record
  const { data: participant, error } = await adminClient
    .from('request_participants')
    .upsert(
      {
        tenant_id: payload.tenantId,
        request_id: payload.requestId,
        email: normalizedEmail,
        role: payload.role,
        is_external: isExternal,
        added_by: payload.addedById,
        added_at: new Date().toISOString(),
        reason: payload.reason || null,
        state: 'PENDING',
      },
      { onConflict: 'tenant_id,request_id,email,role' }
    )
    .select()
    .single();

  if (error) throw error;
  return participant;
}

/**
 * Preserves a participant's endorsement or dissent comment verbatim.
 * CRITICAL RULE: This action NEVER advances or modifies the request state.
 */
export async function respondAsParticipant(payload: {
  participantId: string;
  tenantId: string;
  state: 'RESPONDED' | 'DECLINED';
  comment?: string;
}) {
  const { data: participant, error } = await adminClient
    .from('request_participants')
    .update({
      state: payload.state,
      responded_at: new Date().toISOString(),
      comment: payload.comment || null,
    })
    .eq('id', payload.participantId)
    .eq('tenant_id', payload.tenantId)
    .select()
    .single();

  if (error) throw error;

  // CRITICAL INVARIANT VERIFICATION: No approval step or request status is touched here!
  return participant;
}
