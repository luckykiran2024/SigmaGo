import { describe, it, expect } from 'vitest';

export interface UserContext {
  userId: string;
  authUserId: string;
  tenantId: string;
  role: 'employee' | 'approver' | 'admin' | 'owner';
  intelligenceGrant?: 'NONE' | 'AGGREGATE_ONLY' | 'FULL';
}

/**
 * Deterministic Simulation of the Postgres RLS Policy Logic
 * (Implements current_user_profile_id() and has_active_intelligence_grant() semantics)
 */
export function evaluateRequestReadPolicy(
  user: UserContext,
  request: {
    id: string;
    tenantId: string;
    ownerId: string;
    beneficiaryId?: string | null;
    steps?: Array<{ approverId: string }>;
    participants?: Array<{ email: string }>;
  }
): boolean {
  // 1. Strict Tenant Isolation
  if (user.tenantId !== request.tenantId) return false;

  // 2. Tenant Admin / Owner
  if (user.role === 'admin' || user.role === 'owner') return true;

  // 3. Full Intelligence Auditor
  if (user.intelligenceGrant === 'FULL') return true;

  // 4. Request Owner or Beneficiary (uses internal user.userId, NOT authUserId!)
  if (request.ownerId === user.userId) return true;
  if (request.beneficiaryId === user.userId) return true;

  // 5. Assigned Approver
  if (request.steps?.some((s) => s.approverId === user.userId)) return true;

  return false;
}

export function evaluateApprovalStepReadPolicy(
  user: UserContext,
  request: { id: string; tenantId: string; ownerId: string },
  step: { requestId: string; approverId: string }
): boolean {
  if (user.tenantId !== request.tenantId) return false;
  if (user.role === 'admin' || user.role === 'owner') return true;
  if (user.intelligenceGrant === 'FULL') return true;
  if (request.ownerId === user.userId) return true;
  if (step.approverId === user.userId) return true;

  return false;
}

export function evaluateIntelligenceMetricsReadPolicy(
  user: UserContext,
  metric: { tenantId: string }
): boolean {
  if (user.tenantId !== metric.tenantId) return false;
  if (user.role === 'admin' || user.role === 'owner') return true;
  if (user.intelligenceGrant === 'AGGREGATE_ONLY' || user.intelligenceGrant === 'FULL') return true;

  return false;
}

describe('Workstream 3: Authoritative RLS Role & Access Matrix Suite', () => {
  // Scenario: Internal users.id explicitly differs from auth.uid()
  const employeeAlice: UserContext = {
    userId: 'uuid-internal-alice',
    authUserId: 'uuid-supabase-auth-alice',
    tenantId: 'tenant-alpha',
    role: 'employee',
    intelligenceGrant: 'NONE',
  };

  const approverBob: UserContext = {
    userId: 'uuid-internal-bob',
    authUserId: 'uuid-supabase-auth-bob',
    tenantId: 'tenant-alpha',
    role: 'approver',
    intelligenceGrant: 'NONE',
  };

  const analystCarol: UserContext = {
    userId: 'uuid-internal-carol',
    authUserId: 'uuid-supabase-auth-carol',
    tenantId: 'tenant-alpha',
    role: 'employee',
    intelligenceGrant: 'AGGREGATE_ONLY',
  };

  const auditorDave: UserContext = {
    userId: 'uuid-internal-dave',
    authUserId: 'uuid-supabase-auth-dave',
    tenantId: 'tenant-alpha',
    role: 'employee',
    intelligenceGrant: 'FULL',
  };

  const tenantAdminEve: UserContext = {
    userId: 'uuid-internal-eve',
    authUserId: 'uuid-supabase-auth-eve',
    tenantId: 'tenant-alpha',
    role: 'admin',
  };

  const intruderMallory: UserContext = {
    userId: 'uuid-internal-mallory',
    authUserId: 'uuid-supabase-auth-mallory',
    tenantId: 'tenant-beta', // Foreign tenant
    role: 'admin',
  };

  const confidentialRequest = {
    id: 'req-secret-1',
    tenantId: 'tenant-alpha',
    ownerId: 'uuid-internal-alice',
    beneficiaryId: null,
    steps: [{ approverId: 'uuid-internal-bob' }],
  };

  const confidentialStep = {
    requestId: 'req-secret-1',
    approverId: 'uuid-internal-bob',
  };

  const alphaOiMetric = {
    tenantId: 'tenant-alpha',
  };

  it('1. Owner can read their own request and its steps even when users.id != auth_user_id', () => {
    expect(evaluateRequestReadPolicy(employeeAlice, confidentialRequest)).toBe(true);
    expect(evaluateApprovalStepReadPolicy(employeeAlice, confidentialRequest, confidentialStep)).toBe(true);
  });

  it('2. Assigned approver can read assigned request and step', () => {
    expect(evaluateRequestReadPolicy(approverBob, confidentialRequest)).toBe(true);
    expect(evaluateApprovalStepReadPolicy(approverBob, confidentialRequest, confidentialStep)).toBe(true);
  });

  it('3. Ordinary employee cannot read unassigned confidential requests, steps, or OI metrics', () => {
    const uninvolvedEmployee: UserContext = {
      userId: 'uuid-internal-stranger',
      authUserId: 'uuid-auth-stranger',
      tenantId: 'tenant-alpha',
      role: 'employee',
      intelligenceGrant: 'NONE',
    };

    expect(evaluateRequestReadPolicy(uninvolvedEmployee, confidentialRequest)).toBe(false);
    expect(evaluateApprovalStepReadPolicy(uninvolvedEmployee, confidentialRequest, confidentialStep)).toBe(false);
    expect(evaluateIntelligenceMetricsReadPolicy(uninvolvedEmployee, alphaOiMetric)).toBe(false);
  });

  it('4. AGGREGATE_ONLY grantee can read OI metrics but cannot read confidential request steps', () => {
    expect(evaluateIntelligenceMetricsReadPolicy(analystCarol, alphaOiMetric)).toBe(true);
    expect(evaluateRequestReadPolicy(analystCarol, confidentialRequest)).toBe(false);
    expect(evaluateApprovalStepReadPolicy(analystCarol, confidentialRequest, confidentialStep)).toBe(false);
  });

  it('5. FULL Intelligence grantee can inspect all tenant decisions for auditing', () => {
    expect(evaluateIntelligenceMetricsReadPolicy(auditorDave, alphaOiMetric)).toBe(true);
    expect(evaluateRequestReadPolicy(auditorDave, confidentialRequest)).toBe(true);
    expect(evaluateApprovalStepReadPolicy(auditorDave, confidentialRequest, confidentialStep)).toBe(true);
  });

  it('6. Tenant Admin has full visibility across tenant resources', () => {
    expect(evaluateRequestReadPolicy(tenantAdminEve, confidentialRequest)).toBe(true);
    expect(evaluateApprovalStepReadPolicy(tenantAdminEve, confidentialRequest, confidentialStep)).toBe(true);
    expect(evaluateIntelligenceMetricsReadPolicy(tenantAdminEve, alphaOiMetric)).toBe(true);
  });

  it('7. Cross-tenant access is strictly denied regardless of role or grants', () => {
    expect(evaluateRequestReadPolicy(intruderMallory, confidentialRequest)).toBe(false);
    expect(evaluateApprovalStepReadPolicy(intruderMallory, confidentialRequest, confidentialStep)).toBe(false);
    expect(evaluateIntelligenceMetricsReadPolicy(intruderMallory, alphaOiMetric)).toBe(false);
  });
});
