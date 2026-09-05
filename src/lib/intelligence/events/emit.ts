import { adminClient } from '@/lib/supabase/admin';
import { EmitDecisionEventPayload } from './types';

/**
 * Emits an append-only decision event to the decision_events table.
 * Designed to execute asynchronously without blocking the primary transactional path.
 */
export async function emitDecisionEvent(payload: EmitDecisionEventPayload): Promise<void> {
  try {
    const { error } = await adminClient
      .from('decision_events')
      .insert({
        tenant_id:           payload.tenantId,
        request_id:          payload.requestId,
        workflow_id:         payload.workflowId || null,
        workflow_version_id: payload.workflowVersionId || null,
        event_type:          payload.eventType,
        event_at:            payload.eventAt || new Date().toISOString(),
        actor_id:            payload.actorId || null,
        step_id:             payload.stepId || null,
        baseline_step_type:  payload.baselineStepType || null,
        resolved_step_type:  payload.resolvedStepType || null,
        policy_id:           payload.policyId || null,
        parent_reference_id: payload.parentReferenceId || null,
        stance:              payload.stance || null,
        outcome:             payload.outcome || null,
        was_binding:         payload.wasBinding !== undefined ? payload.wasBinding : null,
        event_payload:       {
          event_schema_version: payload.eventSchemaVersion || 1,
          ...(payload.eventPayload || {}),
        },
        correlation_id:      payload.correlationId || null,
      });

    if (error) {
      console.error('Failed to emit decision event to database:', error);
    }
  } catch (err) {
    // Non-blocking: operational transaction must never fail due to analytics logging failure
    console.error('Exception while emitting decision event:', err);
  }
}
