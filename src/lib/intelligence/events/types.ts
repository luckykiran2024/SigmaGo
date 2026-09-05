export type DecisionEventType =
  | 'REQUEST_CREATED'
  | 'WORKFLOW_RESOLVED'
  | 'REQUEST_SUBMITTED'
  | 'STEP_ENTERED'
  | 'STEP_ACTED'
  | 'STEP_APPROVED'
  | 'STEP_REJECTED'
  | 'STEP_CHANGES_REQUESTED'
  | 'STEP_DELEGATED'
  | 'DISCUSSION_STARTED'
  | 'DISCUSSION_ENDED'
  | 'PATH_CHANGED'
  | 'CLASSIFICATION_RESOLVED'
  | 'CLASSIFICATION_OVERRIDDEN'
  | 'EXCEPTION_DETECTED'
  | 'POLICY_REFERENCED'
  | 'REFERENCE_ADDED'
  | 'REFERENCE_REMOVED'
  | 'REQUEST_FINALIZED'
  | 'REQUEST_SEALED'
  | 'REQUEST_RENEWED'
  | 'REQUEST_REPLACED'
  | 'REQUEST_EXPIRED'
  | 'REVIEW_DUE';

export interface EmitDecisionEventPayload {
  tenantId: string;
  requestId: string;
  workflowId?: string | null;
  workflowVersionId?: string | null;
  eventType: DecisionEventType;
  eventSchemaVersion?: number;
  eventAt?: string;
  actorId?: string | null;
  stepId?: string | null;
  baselineStepType?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS' | null;
  resolvedStepType?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS' | null;
  policyId?: string | null;
  parentReferenceId?: string | null;
  stance?: 'ENDORSED' | 'APPROVED_WITH_RESERVATION' | 'REJECTED' | 'CHANGES_REQUESTED' | null;
  outcome?: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'CHANGES_REQUESTED' | 'DELEGATED' | null;
  wasBinding?: boolean | null;
  eventPayload?: Record<string, any>;
  correlationId?: string | null;
}
