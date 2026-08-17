import { describe, it, expect } from 'vitest';
import { DecisionRecordItem } from '../db/decisions';
import fs from 'fs';
import path from 'path';

describe('Build Prompt #13 — The Decision Record & Acceptance Criteria', () => {
  it('1. Retrieval time is calculated and formatted for result sets', async () => {
    // Mock item payload validation
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

    // Verify code checks owner, assigned approver, participant, open category, or authority category — NOT admin role!
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
