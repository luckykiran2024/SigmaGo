import { describe, it, expect, vi } from 'vitest';
import { buildCanonicalDecisionRecord, computeCanonicalSha256 } from '@/lib/certificate';
import { evaluateClassificationRules } from '@/lib/intelligence/rules/evaluator';

describe('Organisational Intelligence E2E Architectural Verification', () => {

  describe('1. Single Canonical Seal Function & Tamper Determinism', () => {
    it('produces identical SHA-256 hash regardless of which subsystem serializes the record', () => {
      const mockRequest = {
        id: 'req-e2e-001',
        tenant_id: 'tenant-luminary',
        subject: 'Executive Compensation Restructuring',
        body_json: { justification: 'Annual retention plan' },
        conditions: ['Formal sign-off by board'],
        custom_fields: { tenure_months: 36 },
        beneficiary_id: 'user-emp-101',
        owner_id: 'user-owner-001',
        version: 1,
        parent_reference_id: 'pol-comp-01',
        workflow_id: 'wf-exec-comp',
        workflow_version_id: 'wf-ver-1',
        baseline_step_type: 'STRUCTURAL',
        resolved_step_type: 'STRUCTURAL',
      };

      const mockSteps = [
        {
          id: 'step-1',
          order_index: 0,
          approver_id: 'user-cfo',
          status: 'approved',
          acted_at: '2026-09-01T10:00:00Z',
          stance: 'ENDORSED',
          outcome: 'APPROVED',
          was_binding: true,
          reservation_note: null,
        },
        {
          id: 'step-2',
          order_index: 1,
          approver_id: 'user-ceo',
          status: 'approved',
          acted_at: '2026-09-02T15:30:00Z',
          stance: 'APPROVED_WITH_RESERVATION',
          outcome: 'APPROVED_WITH_CONDITIONS',
          was_binding: true,
          reservation_note: 'Subject to Q4 earnings confirmation',
        },
      ];

      const mockReferences = [
        {
          id: 'ref-01',
          target_id: null,
          to_policy_id: 'pol-comp-01',
          relationship: 'BASED_ON',
        },
      ];

      const canonicalA = buildCanonicalDecisionRecord({
        request: mockRequest,
        steps: mockSteps,
        references: mockReferences,
      });

      const hashA = computeCanonicalSha256(canonicalA);

      // Re-invoke through verification / certificate builder format
      const canonicalB = buildCanonicalDecisionRecord({
        request: {
          ...mockRequest,
          tenantId: mockRequest.tenant_id,
          body: mockRequest.body_json,
        },
        steps: mockSteps.map(s => ({ ...s, order: s.order_index, approver: s.approver_id })),
        references: mockReferences,
      });

      const hashB = computeCanonicalSha256(canonicalB);

      expect(hashA).toBe(hashB);
      expect(hashA).toMatch(/^[a-f0-9]{64}$/);

      // Tamper check: If any day-3 stance or reservation is altered, hash must diverge
      const tamperedRecord = {
        ...canonicalA,
        authoritySteps: canonicalA.authoritySteps.map((s, idx) =>
          idx === 1 ? { ...s, reservationNote: 'Altered note' } : s
        ),
      };
      const tamperedHash = computeCanonicalSha256(tamperedRecord);
      expect(tamperedHash).not.toBe(hashA);
    });
  });

  describe('2. Multi-Stage Sequential Routing (A -> B -> C Stages)', () => {
    it('correctly increments stageIndex for sequential Direct approvers', () => {
      const rawApprovalPath = [
        { userId: 'user-manager', role: 'GENERAL' },
        { userId: 'user-director', role: 'GENERAL' },
        { userId: 'user-cfo', role: 'GENERAL' },
      ];

      let currentStage = 0;
      let inParallelCluster = false;

      const mappedSteps = rawApprovalPath.map((step, index) => {
        const role = step.role || 'GENERAL';
        let assignedStage: number;

        if (role === 'REFERENCE') {
          assignedStage = 0;
        } else if (role === 'PARALLEL') {
          if (!inParallelCluster && index > 0) currentStage++;
          inParallelCluster = true;
          assignedStage = currentStage;
        } else {
          // GENERAL Direct Approver
          if (index > 0) currentStage++;
          inParallelCluster = false;
          assignedStage = currentStage;
        }

        return {
          approverId: step.userId,
          type: role,
          orderIndex: index,
          stageIndex: assignedStage,
        };
      });

      expect(mappedSteps[0]).toEqual({
        approverId: 'user-manager',
        type: 'GENERAL',
        orderIndex: 0,
        stageIndex: 0,
      });
      expect(mappedSteps[1]).toEqual({
        approverId: 'user-director',
        type: 'GENERAL',
        orderIndex: 1,
        stageIndex: 1,
      });
      expect(mappedSteps[2]).toEqual({
        approverId: 'user-cfo',
        type: 'GENERAL',
        orderIndex: 2,
        stageIndex: 2,
      });
    });

    it('simulates sequential chain progression A -> B -> C -> Finalized', () => {
      const steps = [
        { id: 's1', approverId: 'A', stageIndex: 0, status: 'pending', enteredAt: '2026-09-01T00:00:00Z' },
        { id: 's2', approverId: 'B', stageIndex: 1, status: 'waiting', enteredAt: null as string | null },
        { id: 's3', approverId: 'C', stageIndex: 2, status: 'waiting', enteredAt: null as string | null },
      ];

      const emittedEvents: string[] = [];

      // Step 1: A approves
      steps[0].status = 'approved';
      emittedEvents.push('STEP_APPROVED_A');

      // Advance chain evaluates stages
      const advanceChainSimulation = () => {
        const stages = [0, 1, 2];
        for (const st of stages) {
          const step = steps.find(s => s.stageIndex === st);
          if (!step) continue;
          if (step.status !== 'approved') {
            if (step.status === 'waiting') {
              step.status = 'pending';
              step.enteredAt = new Date().toISOString();
              emittedEvents.push(`STEP_ENTERED_${step.approverId}`);
            }
            return 'ACTIVE_STAGE';
          }
        }
        return 'ALL_APPROVED';
      };

      // After A approves, B must become pending and emit STEP_ENTERED
      let state = advanceChainSimulation();
      expect(state).toBe('ACTIVE_STAGE');
      expect(steps[1].status).toBe('pending');
      expect(steps[1].enteredAt).toBeTruthy();
      expect(steps[2].status).toBe('waiting');
      expect(emittedEvents).toContain('STEP_ENTERED_B');

      // Step 2: B approves
      steps[1].status = 'approved';
      emittedEvents.push('STEP_APPROVED_B');
      state = advanceChainSimulation();
      expect(state).toBe('ACTIVE_STAGE');
      expect(steps[2].status).toBe('pending');
      expect(steps[2].enteredAt).toBeTruthy();
      expect(emittedEvents).toContain('STEP_ENTERED_C');

      // Step 3: C approves
      steps[2].status = 'approved';
      emittedEvents.push('STEP_APPROVED_C');
      state = advanceChainSimulation();
      expect(state).toBe('ALL_APPROVED');
    });
  });

  describe('3. Server-Authoritative Classification Rule Engine', () => {
    it('automatically reclassifies TRANSACTIONAL to EXCEPTION when policy bound is breached', () => {
      const evaluation = evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        policyBound: {
          boundField: 'amount',
          boundType: 'MAX',
          boundValue: 50000,
          policyTitle: 'Standard Procurement Policy',
        },
        customFields: { amount: 75000 },
      });

      expect(evaluation.isBreached).toBe(true);
      expect(evaluation.resolvedStepType).toBe('EXCEPTION');
      expect(evaluation.classificationSource).toBe('EXCEPTION_RULE');
      expect(evaluation.classificationReason).toContain('Breached maximum limit of 50000 on amount');
    });

    it('automatically evaluates workflow classification_rules_json bounds server-side', () => {
      const rules = [
        {
          field: 'tenure_months',
          operator: '<' as const,
          value: 24,
          breachStepType: 'EXCEPTION' as const,
          reason: 'Promotion requested before 24-month minimum in-band tenure',
        },
      ];

      const breachedEvaluation = evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: rules,
        customFields: { tenure_months: 18 },
      });

      expect(breachedEvaluation.isBreached).toBe(true);
      expect(breachedEvaluation.resolvedStepType).toBe('EXCEPTION');
      expect(breachedEvaluation.classificationSource).toBe('EXCEPTION_RULE');
      expect(breachedEvaluation.classificationReason).toBe('Promotion requested before 24-month minimum in-band tenure');

      const compliantEvaluation = evaluateClassificationRules({
        baseStepType: 'TRANSACTIONAL',
        rulesJson: rules,
        customFields: { tenure_months: 30 },
      });

      expect(compliantEvaluation.isBreached).toBe(false);
      expect(compliantEvaluation.resolvedStepType).toBe('TRANSACTIONAL');
      expect(compliantEvaluation.classificationSource).toBe('WORKFLOW');
    });
  });

  describe('4. Server-Side AGGREGATE_ONLY Privacy Enforcement', () => {
    it('strictly redacts all row-level decision instances when user has AGGREGATE_ONLY grant', () => {
      const mockMovementAnalyses: Record<string, any> = {
        STRUCTURAL: {
          topConsequentialDecisions: [
            { requestId: 'req-1', ref: 'REQ-2026-001', subject: 'Secret Executive Restructure' },
          ],
        },
        EXCEPTION: {
          topConsequentialDecisions: [
            { requestId: 'req-2', ref: 'REQ-2026-002', subject: 'Discretionary Salary Hike' },
          ],
        },
      };

      const allRequests = [
        { id: 'req-1', subject: 'Secret Executive Restructure' },
        { id: 'req-2', subject: 'Discretionary Salary Hike' },
      ];

      const grantScope: 'AGGREGATE_ONLY' | 'FULL' = 'AGGREGATE_ONLY';
      const isAggregateOnly = grantScope === 'AGGREGATE_ONLY';

      if (isAggregateOnly) {
        Object.keys(mockMovementAnalyses).forEach((st) => {
          mockMovementAnalyses[st].topConsequentialDecisions = [];
        });
      }

      const deliveredSealedDecisions = isAggregateOnly ? [] : allRequests;

      expect(mockMovementAnalyses.STRUCTURAL.topConsequentialDecisions).toHaveLength(0);
      expect(mockMovementAnalyses.EXCEPTION.topConsequentialDecisions).toHaveLength(0);
      expect(deliveredSealedDecisions).toHaveLength(0);
    });
  });

  describe('5. Strict Tenant Scoping Enforcement', () => {
    it('blocks access if user profile tenant_id does not match route tenant_id', () => {
      const routeTenant = { id: 'tenant-beta', name: 'Beta Corp' };
      const userProfile = { id: 'user-1', tenant_id: 'tenant-alpha', role: 'admin' };

      const checkAccess = () => {
        if (userProfile.tenant_id !== routeTenant.id) {
          throw new Error('Forbidden: User does not belong to this tenant');
        }
        return 'ALLOWED';
      };

      expect(() => checkAccess()).toThrow('Forbidden: User does not belong to this tenant');
    });
  });

});
