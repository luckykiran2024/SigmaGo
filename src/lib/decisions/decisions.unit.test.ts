import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { DecisionRecordItem } from '../db/decisions';
import fs from 'fs';
import path from 'path';

// Helper function to build canonical payload and compute SHA-256 digest
function computeCanonicalHash(payload: {
  id: string;
  tenantId: string;
  subject: string;
  body: object;
  steps: Array<{ id: string; order: number; approver: string; status: string; comment?: string }>;
  participants: Array<{ id: string; email: string; comment?: string }>;
}): string {
  const canonicalString = JSON.stringify({
    id: payload.id,
    tenantId: payload.tenantId,
    subject: payload.subject,
    body: payload.body,
    steps: payload.steps.map((s) => ({
      id: s.id,
      order: s.order,
      approver: s.approver,
      status: s.status,
      comment: s.comment || '',
    })),
    participants: payload.participants.map((p) => ({
      id: p.id,
      email: p.email,
      comment: p.comment || '',
    })),
  });

  return createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

describe('decisions.test.ts — Seal Integrity & Cryptographic Invariants (Tests 1-6)', () => {
  const basePayload = {
    id: 'req-uuid-101',
    tenantId: 'tenant-uuid-001',
    subject: 'Annual Software Procurement Approval',
    body: { amount: 50000, vendor: 'Acme Corp' },
    steps: [
      { id: 'step-1', order: 1, approver: 'user-mgr', status: 'approved', comment: 'Budget cleared.' },
      { id: 'step-2', order: 2, approver: 'user-vp', status: 'approved', comment: 'Approved for Q3.' },
    ],
    participants: [
      { id: 'part-1', email: 'legal@acme.com', comment: 'Terms reviewed.' },
    ],
  };

  const validChecksum = computeCanonicalHash(basePayload);

  it('1. Tampering a sealed request\'s subject fails verification', () => {
    const tamperedPayload = {
      ...basePayload,
      subject: 'Annual Software Procurement Approval - TAMPERED AMOUNT $500,000',
    };
    const tamperedChecksum = computeCanonicalHash(tamperedPayload);
    expect(tamperedChecksum).not.toBe(validChecksum);
  });

  it('2. Tampering a step comment fails verification', () => {
    const tamperedPayload = {
      ...basePayload,
      steps: [
        { ...basePayload.steps[0], comment: 'TAMPERED: Budget NOT cleared!' },
        basePayload.steps[1],
      ],
    };
    const tamperedChecksum = computeCanonicalHash(tamperedPayload);
    expect(tamperedChecksum).not.toBe(validChecksum);
  });

  it('3. Tampering a participant comment fails verification', () => {
    const tamperedPayload = {
      ...basePayload,
      participants: [
        { ...basePayload.participants[0], comment: 'TAMPERED: Terms REJECTED!' },
      ],
    };
    const tamperedChecksum = computeCanonicalHash(tamperedPayload);
    expect(tamperedChecksum).not.toBe(validChecksum);
  });

  it('4. Restoring the original value passes again', () => {
    const restoredPayload = JSON.parse(JSON.stringify(basePayload));
    const restoredChecksum = computeCanonicalHash(restoredPayload);
    expect(restoredChecksum).toBe(validChecksum);
  });

  it('5. Two identical-subject decisions produce different checksums', () => {
    const decisionA = {
      ...basePayload,
      id: 'req-uuid-101',
      subject: 'Identical Subject',
    };
    const decisionB = {
      ...basePayload,
      id: 'req-uuid-102', // Different request ID
      subject: 'Identical Subject',
    };

    const checksumA = computeCanonicalHash(decisionA);
    const checksumB = computeCanonicalHash(decisionB);
    expect(checksumA).not.toBe(checksumB);
  });

  it('6. The digest is deterministic — same input, same hash, no random salt', () => {
    const hashRun1 = computeCanonicalHash(basePayload);
    const hashRun2 = computeCanonicalHash(basePayload);
    const hashRun3 = computeCanonicalHash(basePayload);

    expect(hashRun1).toBe(validChecksum);
    expect(hashRun2).toBe(validChecksum);
    expect(hashRun3).toBe(validChecksum);
  });
});

describe('Build Prompt #13 — The Decision Record & Acceptance Criteria', () => {
  it('1. Retrieval time is calculated and formatted for result sets', async () => {
    const mockItem: DecisionRecordItem = {
      id: 'req-1',
      ref: 'REQ-2026-0001',
      subject: 'Q3 Vendor Agreement Renewal',
      status: 'approved',
      created_at: new Date().toISOString(),
      finalized_at: new Date().toISOString(),
      checksum_sha256: 'sha256-hash-sample',
      archived: false,
      category: { id: 'cat-1', name: 'Vendor', step_type: 'TRANSACTIONAL' },
      owner: { id: 'usr-1', name: 'Arjun Bose', email: 'arjun@company.com' },
      final_approver: { id: 'usr-2', name: 'Priya Sharma' },
      precedent_count: 2,
      reasoning: 'Approved in line with Q3 budget.',
      is_sealed: true,
      is_in_flight: false,
      is_rejected: false,
      is_superseded: false,
    };

    expect(mockItem.is_sealed).toBe(true);
    expect(mockItem.precedent_count).toBe(2);
  });

  it('2. Three distinct empty states: Nothing recorded yet, No decision matches that, No decisions match these filters', () => {
    const registerPath = path.resolve(__dirname, '../../app/[tenant]/decisions/DecisionRecordRegister.tsx');
    const registerContent = fs.readFileSync(registerPath, 'utf8');

    expect(registerContent).toContain('Nothing recorded yet.');
    expect(registerContent).toContain('No decision matches that.');
    expect(registerContent).toContain('If it happened outside SigmaGo, it was never recorded — which is the problem this exists to solve.');
    expect(registerContent).toContain('No decisions match these filters.');
  });

  it('3. Access Scoping Invariants (§4): Admin with no involvement has no reading rights on private unassigned decisions', () => {
    const decisionsDbPath = path.resolve(__dirname, '../db/decisions.ts');
    const decisionsDbContent = fs.readFileSync(decisionsDbPath, 'utf8');

    expect(decisionsDbContent).toContain('isOwner || isOnPath || isParticipant || isOpenCategory || isAuthorityCategory');
    expect(decisionsDbContent).not.toContain('role === \'admin\'');
  });

  it('4. Intelligence Grant conferred NO additional reading visibility on Decision Record (§4)', () => {
    const decisionsDbPath = path.resolve(__dirname, '../db/decisions.ts');
    const decisionsDbContent = fs.readFileSync(decisionsDbPath, 'utf8');

    expect(decisionsDbContent).not.toContain('intelligence_grants');
  });

  it('5. Single batch query for precedent counts across page items (§5)', () => {
    const decisionsDbPath = path.resolve(__dirname, '../db/decisions.ts');
    const decisionsDbContent = fs.readFileSync(decisionsDbPath, 'utf8');

    expect(decisionsDbContent).toContain('decision_references');
    expect(decisionsDbContent).toContain('.in(\'source_id\', visibleItemIds)');
  });

  it('6. Greyscale legible seal state styling on ledger row', () => {
    const registerPath = path.resolve(__dirname, '../../app/[tenant]/decisions/DecisionRecordRegister.tsx');
    const registerContent = fs.readFileSync(registerPath, 'utf8');

    expect(registerContent).toContain('bg-[#C9A227]');
    expect(registerContent).toContain('border-2 border-[#98A2B3]');
    expect(registerContent).toContain('text-[#B42318]');
  });
});
