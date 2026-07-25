import crypto from 'crypto';

export function computeRequestChecksum(request: {
  ref?: string | null;
  subject?: string | null;
  body_json?: any;
  owner_id?: string | null;
  beneficiary_id?: string | null;
  created_at?: string | Date | null;
  references?: Array<{ targetRef: string; relationship: string }> | null;
}): string {
  const sortedRefs = (request.references || [])
    .map(r => `${r.relationship}:${r.targetRef}`)
    .sort();

  const canonicalPayload = JSON.stringify({
    ref: request.ref || '',
    subject: request.subject || '',
    body: request.body_json || {},
    ownerId: request.owner_id || '',
    beneficiaryId: request.beneficiary_id || null,
    createdAt: request.created_at ? new Date(request.created_at).toISOString() : '',
    references: sortedRefs,
  });

  return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
}
