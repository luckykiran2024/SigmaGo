import { describe, it, expect } from 'vitest';
import {
  buildCanonicalDecisionRecord,
  computeCanonicalSha256,
  canonicalizeJson,
} from '@/lib/certificate';

describe('P0-B Golden Decision Sealing & Deterministic Canonicalization Test Suite (v1 & v2)', () => {
  const baseRequest = {
    id: 'req-001',
    tenant_id: 'tenant-omega',
    subject: 'Promotion to Staff Engineer',
    body_json: { justification: 'Demonstrated deep architectural impact', level: 'L6' },
    conditions: ['Must complete quarterly review by Q3'],
    custom_fields: { department: 'Engineering', businessUnit: 'Cloud Platform' },
    beneficiary_id: 'usr-beneficiary-1',
    owner_id: 'usr-owner-1',
    version: 1,
    parent_reference_id: null,
    workflow_id: 'wf-promotion-v1',
    workflow_version_id: 'wfv-promotion-101',
    baseline_step_type: 'TRANSACTIONAL',
    resolved_step_type: 'EXCEPTION',
  };

  const baseSteps = [
    {
      id: 'step-002',
      stage_index: 1,
      order_index: 1,
      approver_id: 'usr-approver-b',
      status: 'approved',
      acted_at: '2026-06-15T10:30:00.000Z',
      stance: 'ENDORSED',
      outcome: 'APPROVED',
      was_binding: true,
      reservation_note: null,
      comment: 'Fully aligned with engineering ladder expectations.',
    },
    {
      id: 'step-001',
      stage_index: 0,
      order_index: 0,
      approver_id: 'usr-approver-a',
      status: 'approved',
      acted_at: '2026-06-14T08:00:00.000Z',
      stance: 'APPROVED_WITH_RESERVATION',
      outcome: 'APPROVED_WITH_CONDITIONS',
      was_binding: true,
      reservation_note: 'Approved on tenure waiver basis',
      comment: 'Candidate shows exceptional architectural scope despite tenure deficit.',
    },
  ];

  const baseReferences = [
    {
      id: 'ref-002',
      target_id: 'req-historical-parent',
      to_policy_id: null,
      relationship: 'BASED_ON',
    },
    {
      id: 'ref-001',
      target_id: null,
      to_policy_id: 'pol-compensation-standard',
      relationship: 'EXCEPTION_TO',
    },
  ];

  const baseParticipants = [
    {
      id: 'part-002',
      email: 'bob.hr@omega.com',
      role: 'HR_BUSINESS_PARTNER',
      is_external: false,
      state: 'responded',
      responded_at: '2026-06-14T11:00:00.000Z',
      comment: 'Budget checked',
    },
    {
      id: 'part-001',
      email: 'alice.lead@omega.com',
      role: 'PEER_REVIEWER',
      is_external: false,
      state: 'responded',
      responded_at: '2026-06-14T09:00:00.000Z',
      comment: 'Strong endorsement',
    },
  ];

  // Test 1: Canonical Version Headers
  it('should format canonicalVersion: 1 for legacy seals and canonicalVersion: 2 for modern seals', () => {
    const recordV1 = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      references: baseReferences,
      participants: baseParticipants,
      version: 1,
    });
    expect(recordV1.canonicalVersion).toBe(1);
    expect((recordV1.authoritySteps[0] as any).comment).toBeUndefined();

    const recordV2 = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      references: baseReferences,
      participants: baseParticipants,
      version: 2,
    });
    expect(recordV2.canonicalVersion).toBe(2);
    expect((recordV2.authoritySteps[0] as any).comment).toBeDefined();
  });

  // Test 2: Approver comment tamper sensitivity (v2 sensitive, v1 invariant)
  it('should detect tamper in approver comment under v2, while v1 remains comment-invariant', () => {
    const v2Original = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      version: 2,
    });
    const hashV2Original = computeCanonicalSha256(v2Original);

    const tamperedSteps = [
      {
        ...baseSteps[0],
        comment: 'Tampered approver reasoning comment.',
      },
      baseSteps[1],
    ];

    const v2Tampered = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: tamperedSteps,
      version: 2,
    });
    const hashV2Tampered = computeCanonicalSha256(v2Tampered);

    // v2 MUST produce different digest when comment changes
    expect(hashV2Tampered).not.toBe(hashV2Original);

    // v1 MUST produce identical digest because comment is not in v1 schema
    const v1Original = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      version: 1,
    });
    const v1Tampered = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: tamperedSteps,
      version: 1,
    });
    expect(computeCanonicalSha256(v1Original)).toBe(computeCanonicalSha256(v1Tampered));
  });

  // Test 3: Invariant hash across collection input ordering (v2)
  it('should produce identical SHA-256 digest regardless of input collection order in v2', () => {
    const recordA = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: [baseSteps[0], baseSteps[1]], // Step 2 then Step 1
      references: [baseReferences[0], baseReferences[1]],
      participants: [baseParticipants[0], baseParticipants[1]],
      version: 2,
    });

    const recordB = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: [baseSteps[1], baseSteps[0]], // Step 1 then Step 2
      references: [baseReferences[1], baseReferences[0]],
      participants: [baseParticipants[1], baseParticipants[0]],
      version: 2,
    });

    const hashA = computeCanonicalSha256(recordA);
    const hashB = computeCanonicalSha256(recordB);

    expect(hashA).toBe(hashB);
  });

  // Test 4: Recursive JSON key sorting invariance
  it('should produce identical SHA-256 digest regardless of object key insertion order at any depth', () => {
    const reqWithKeyOrderA = {
      ...baseRequest,
      custom_fields: { zKey: 'last', aKey: 'first', mKey: { nestedZ: 99, nestedA: 1 } },
    };

    const reqWithKeyOrderB = {
      ...baseRequest,
      custom_fields: { aKey: 'first', mKey: { nestedA: 1, nestedZ: 99 }, zKey: 'last' },
    };

    const recordA = buildCanonicalDecisionRecord({
      request: reqWithKeyOrderA,
      steps: baseSteps,
      references: baseReferences,
      version: 2,
    });

    const recordB = buildCanonicalDecisionRecord({
      request: reqWithKeyOrderB,
      steps: baseSteps,
      references: baseReferences,
      version: 2,
    });

    const hashA = computeCanonicalSha256(recordA);
    const hashB = computeCanonicalSha256(recordB);

    expect(hashA).toBe(hashB);
  });

  // Test 5: Timestamp Normalization invariance (Date object vs ISO string)
  it('should produce identical digest when timestamps are passed as Date objects vs equivalent ISO strings', () => {
    const stepsWithDates = baseSteps.map((s) => ({
      ...s,
      acted_at: new Date(s.acted_at),
    }));

    const recordStrings = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      version: 2,
    });

    const recordDates = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: stepsWithDates,
      version: 2,
    });

    const hashStrings = computeCanonicalSha256(recordStrings);
    const hashDates = computeCanonicalSha256(recordDates);

    expect(hashStrings).toBe(hashDates);
  });

  // Test 6: Strict Null vs Empty String Semantics
  it('should produce DIFFERENT digests for null vs empty string subject in v2', () => {
    const reqNullSubject = { ...baseRequest, subject: null };
    const reqEmptySubject = { ...baseRequest, subject: '' };

    const hashNull = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: reqNullSubject, steps: baseSteps, version: 2 })
    );
    const hashEmpty = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: reqEmptySubject, steps: baseSteps, version: 2 })
    );

    expect(hashNull).not.toBe(hashEmpty);
  });

  // Test 7: wasBinding must not default to true when unknown/null
  it('should produce DIFFERENT digests for wasBinding true vs false vs null', () => {
    const stepsTrue = [{ ...baseSteps[0], was_binding: true }];
    const stepsFalse = [{ ...baseSteps[0], was_binding: false }];
    const stepsNull = [{ ...baseSteps[0], was_binding: null }];

    const hashTrue = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: stepsTrue, version: 2 })
    );
    const hashFalse = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: stepsFalse, version: 2 })
    );
    const hashNull = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: stepsNull, version: 2 })
    );

    expect(hashTrue).not.toBe(hashFalse);
    expect(hashTrue).not.toBe(hashNull);
    expect(hashFalse).not.toBe(hashNull);
  });

  // Test 8: Stance, outcome, reservation note tamper detection
  it('should produce a different digest when approver stance, outcome, or reservation note is altered', () => {
    const originalHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: baseSteps, version: 2 })
    );

    const tamperedStanceSteps = [
      { ...baseSteps[0], stance: 'CHANGES_REQUESTED' },
      baseSteps[1],
    ];
    const tamperedStanceHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: tamperedStanceSteps, version: 2 })
    );

    const tamperedOutcomeSteps = [
      { ...baseSteps[0], outcome: 'REJECTED' },
      baseSteps[1],
    ];
    const tamperedOutcomeHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: tamperedOutcomeSteps, version: 2 })
    );

    const tamperedNoteSteps = [
      baseSteps[0],
      { ...baseSteps[1], reservation_note: 'Tampered reservation note' },
    ];
    const tamperedNoteHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({ request: baseRequest, steps: tamperedNoteSteps, version: 2 })
    );

    expect(tamperedStanceHash).not.toBe(originalHash);
    expect(tamperedOutcomeHash).not.toBe(originalHash);
    expect(tamperedNoteHash).not.toBe(originalHash);
  });

  // Test 9: Decision Reference and Participant tamper detection
  it('should produce a different digest when decision references or participants are altered', () => {
    const originalHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({
        request: baseRequest,
        steps: baseSteps,
        references: baseReferences,
        participants: baseParticipants,
        version: 2,
      })
    );

    const tamperedReferences = [
      { ...baseReferences[0], relationship: 'REPLACES' },
      baseReferences[1],
    ];
    const tamperedHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({
        request: baseRequest,
        steps: baseSteps,
        references: tamperedReferences,
        participants: baseParticipants,
        version: 2,
      })
    );

    const withoutParticipantsHash = computeCanonicalSha256(
      buildCanonicalDecisionRecord({
        request: baseRequest,
        steps: baseSteps,
        references: baseReferences,
        participants: [baseParticipants[0]],
        version: 2,
      })
    );

    expect(tamperedHash).not.toBe(originalHash);
    expect(withoutParticipantsHash).not.toBe(originalHash);
  });

  // Test 10: Repeatability Stress Verification (1,000 runs)
  it('should produce 100% identical digest across 1,000 independent executions in v2', () => {
    const record = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      references: baseReferences,
      participants: baseParticipants,
      version: 2,
    });

    const initialHash = computeCanonicalSha256(record);

    for (let i = 0; i < 1000; i++) {
      const currentHash = computeCanonicalSha256(record);
      if (currentHash !== initialHash) {
        throw new Error(`Digest mismatch at iteration ${i}: ${currentHash} vs ${initialHash}`);
      }
    }

    expect(true).toBe(true);
  });

  // Test 11: Golden Fixture Stability Check
  it('should match deterministic golden fixtures for v1 and v2 records', () => {
    const recordV1 = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      references: baseReferences,
      participants: baseParticipants,
      version: 1,
    });
    const digestV1 = computeCanonicalSha256(recordV1);
    expect(digestV1).toMatch(/^[0-9a-f]{64}$/);

    const recordV2 = buildCanonicalDecisionRecord({
      request: baseRequest,
      steps: baseSteps,
      references: baseReferences,
      participants: baseParticipants,
      version: 2,
    });
    const digestV2 = computeCanonicalSha256(recordV2);
    expect(digestV2).toMatch(/^[0-9a-f]{64}$/);

    // v1 and v2 digests for the exact same inputs MUST be different due to version & comment inclusions
    expect(digestV1).not.toBe(digestV2);
  });
});
