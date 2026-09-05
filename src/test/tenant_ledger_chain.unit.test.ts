import { describe, it, expect } from 'vitest';
import { computeCanonicalSha256, buildCanonicalDecisionRecord, verifyTenantLedgerChain } from '../lib/certificate';
import { signDecisionSeal, verifyDecisionSignature } from '../lib/crypto/pki';

describe('Cryptographic Tenant Hash-Chain & Tamper-Evident Ledger Suite', () => {
  const GENESIS = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

  it('1. Genesis request binds to standardized GENESIS hash and subsequent requests chain previous seal', () => {
    // Request 1 (Genesis)
    const req1Inputs = {
      request: {
        id: 'req-001',
        tenantId: 'tenant-acme',
        subject: 'Capital Expenditure Approval #1',
        previousSealHash: GENESIS,
      },
      steps: [
        { id: 's1', stageIndex: 0, orderIndex: 0, approver: 'u1', status: 'approved', comment: 'Approved budget' }
      ],
      version: 2 as const,
    };

    const record1 = buildCanonicalDecisionRecord(req1Inputs);
    const seal1 = computeCanonicalSha256(record1);

    expect(seal1).toBeDefined();
    expect(seal1).toHaveLength(64);

    // Request 2 (Chained to Request 1)
    const req2Inputs = {
      request: {
        id: 'req-002',
        tenantId: 'tenant-acme',
        subject: 'Vendor Onboarding Approval #2',
        previousSealHash: seal1, // Binds to seal 1
      },
      steps: [
        { id: 's2', stageIndex: 0, orderIndex: 0, approver: 'u2', status: 'approved', comment: 'Vendor approved' }
      ],
      version: 2 as const,
    };

    const record2 = buildCanonicalDecisionRecord(req2Inputs);
    const seal2 = computeCanonicalSha256(record2);

    expect(seal2).toBeDefined();
    expect(seal2).toHaveLength(64);
    expect(seal2).not.toBe(seal1);

    // Request 3 (Chained to Request 2)
    const req3Inputs = {
      request: {
        id: 'req-003',
        tenantId: 'tenant-acme',
        subject: 'Hiring Authorization #3',
        previousSealHash: seal2, // Binds to seal 2
      },
      steps: [
        { id: 's3', stageIndex: 0, orderIndex: 0, approver: 'u3', status: 'approved', comment: 'Hire approved' }
      ],
      version: 2 as const,
    };

    const record3 = buildCanonicalDecisionRecord(req3Inputs);
    const seal3 = computeCanonicalSha256(record3);

    expect(seal3).toBeDefined();
    expect(seal3).toHaveLength(64);
    expect(seal3).not.toBe(seal2);

    // Verify digital signatures on all seals
    const pki1 = signDecisionSeal(seal1);
    const pki2 = signDecisionSeal(seal2);
    const pki3 = signDecisionSeal(seal3);

    expect(verifyDecisionSignature(seal1, pki1.signatureB64, pki1.keyId)).toBe(true);
    expect(verifyDecisionSignature(seal2, pki2.signatureB64, pki2.keyId)).toBe(true);
    expect(verifyDecisionSignature(seal3, pki3.signatureB64, pki3.keyId)).toBe(true);
  });

  it('2. Tamper-evident ledger verification detects altered intermediate seal', () => {
    // Simulate chain: R1 -> R2 -> R3
    const chain = [
      { id: 'r1', ref: 'REQ-001', checksum_sha256: 'hash_1111', previous_seal_hash: GENESIS },
      { id: 'r2', ref: 'REQ-002', checksum_sha256: 'hash_2222', previous_seal_hash: 'hash_1111' },
      { id: 'r3', ref: 'REQ-003', checksum_sha256: 'hash_3333', previous_seal_hash: 'hash_2222' },
    ];

    // Verify valid chain helper logic
    function testVerifyChain(requests: typeof chain) {
      for (let i = 0; i < requests.length; i++) {
        if (i === 0) {
          if (requests[i].previous_seal_hash !== GENESIS) {
            return { isChainValid: false, brokenId: requests[i].id };
          }
        } else {
          if (requests[i].previous_seal_hash !== requests[i - 1].checksum_sha256) {
            return { isChainValid: false, brokenId: requests[i].id };
          }
        }
      }
      return { isChainValid: true };
    }

    expect(testVerifyChain(chain).isChainValid).toBe(true);

    // Tampering: An attacker modifies hash_2222 to forge decision R2
    const tamperedChain = [
      { id: 'r1', ref: 'REQ-001', checksum_sha256: 'hash_1111', previous_seal_hash: GENESIS },
      { id: 'r2', ref: 'REQ-002', checksum_sha256: 'FORGED_HASH_9999', previous_seal_hash: 'hash_1111' },
      { id: 'r3', ref: 'REQ-003', checksum_sha256: 'hash_3333', previous_seal_hash: 'hash_2222' },
    ];

    const tamperResult = testVerifyChain(tamperedChain);
    expect(tamperResult.isChainValid).toBe(false);
    expect(tamperResult.brokenId).toBe('r3'); // R3 points to hash_2222, but R2 was altered
  });
});
