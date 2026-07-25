import crypto from 'crypto';

export function computeRequestChecksum(request: {
  ref?: string | null;
  subject?: string | null;
  body_json?: any;
  owner_id?: string | null;
  beneficiary_id?: string | null;
  created_at?: string | Date | null;
}): string {
  const canonicalPayload = JSON.stringify({
    ref: request.ref || '',
    subject: request.subject || '',
    body: request.body_json || {},
    ownerId: request.owner_id || '',
    beneficiaryId: request.beneficiary_id || null,
    createdAt: request.created_at ? new Date(request.created_at).toISOString() : ''
  });

  return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
}
