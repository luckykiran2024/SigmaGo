-- Migration: 20260905100000_sprint1_baseline
-- Description: Sprint 1 Security & Canonical Sealing Baseline
-- Adds canonical_version and seal_algorithm to approval_requests,
-- Secures sigmago_act_on_step with explicit validation and server-only execution,
-- Adds atomic sigmago_finalize_seal for Two-Phase Finalization.

BEGIN;

-- 1. Add canonical_version to approval_requests safely
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS canonical_version INT;

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS seal_algorithm TEXT DEFAULT 'SHA-256';

-- Mark historical sealed requests as canonical_version 1
UPDATE approval_requests
SET canonical_version = 1
WHERE checksum_sha256 IS NOT NULL AND (canonical_version IS NULL OR canonical_version = 1);

-- Set default for future rows to Version 2
ALTER TABLE approval_requests
  ALTER COLUMN canonical_version SET DEFAULT 2;

-- Add reasoning_length to approval_steps if not present
ALTER TABLE approval_steps
  ADD COLUMN IF NOT EXISTS reasoning_length INT DEFAULT 0;

-- Update approval_requests_status_check to support Two-Phase Finalization
ALTER TABLE approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_status_check;

ALTER TABLE approval_requests
  ADD CONSTRAINT approval_requests_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'pending'::text,
    'approved'::text,
    'rejected'::text,
    'locked'::text,
    'blocked'::text,
    'in_discussion'::text,
    'FINALIZING'::text,
    'finalizing'::text
  ]));

-- Ensure enum types exist matching Prisma schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalStance') THEN
    CREATE TYPE "ApprovalStance" AS ENUM ('ENDORSED', 'APPROVED_WITH_RESERVATION', 'REJECTED', 'CHANGES_REQUESTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionOutcome') THEN
    CREATE TYPE "ActionOutcome" AS ENUM ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'CHANGES_REQUESTED', 'DELEGATED');
  END IF;
END $$;

ALTER TABLE approval_steps 
  ALTER COLUMN stance TYPE "ApprovalStance" USING stance::"ApprovalStance",
  ALTER COLUMN outcome TYPE "ActionOutcome" USING outcome::"ActionOutcome";

ALTER TABLE decision_events 
  ALTER COLUMN stance TYPE "ApprovalStance" USING stance::"ApprovalStance",
  ALTER COLUMN outcome TYPE "ActionOutcome" USING outcome::"ActionOutcome";

-- 2. Create or Replace Atomic sigmago_act_on_step
CREATE OR REPLACE FUNCTION sigmago_act_on_step(
  p_step_id UUID,
  p_actor_id UUID,
  p_tenant_id UUID,
  p_action TEXT, -- 'approved' | 'rejected' | 'discuss' | 'request_changes' | 'delegate'
  p_stance TEXT,
  p_outcome TEXT,
  p_was_binding BOOLEAN,
  p_reservation_note TEXT,
  p_comment TEXT,
  p_condition_text TEXT,
  p_action_source TEXT,
  p_delegation_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_step_lookup RECORD;
  v_step RECORD;
  v_req RECORD;
  v_actor RECORD;
  v_approver RECORD;
  v_delegation_id UUID := p_delegation_id;
  v_all_stage_steps_approved BOOLEAN;
  v_next_stage_index INT;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_normalized_action TEXT := lower(trim(p_action));
  v_stance "ApprovalStance" := NULLIF(p_stance, '')::"ApprovalStance";
  v_outcome "ActionOutcome" := NULLIF(p_outcome, '')::"ActionOutcome";
BEGIN
  -- Strict Action Validation (Reject unknown actions, no silent fallback to approve)
  IF v_normalized_action NOT IN ('approve', 'approved', 'reject', 'rejected', 'discuss', 'request_changes', 'delegate') THEN
    RAISE EXCEPTION 'Invalid approval action: %', p_action USING ERRCODE = '22023';
  END IF;

  -- 1. Idempotency Check: If step was already processed with this key, return existing result without duplicate side-effects
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, status, acted_at INTO v_step
    FROM approval_steps
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'step_id', v_step.id,
        'status', v_step.status
      );
    END IF;
  END IF;

  -- 2. Lookup target step to find request_id
  SELECT request_id, status INTO v_step_lookup
  FROM approval_steps
  WHERE id = p_step_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval step not found' USING ERRCODE = 'P0002';
  END IF;

  -- If step is already no longer pending, treat as already processed
  IF v_step_lookup.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'step_id', p_step_id,
      'status', v_step_lookup.status
    );
  END IF;

  -- 3. Lock the approval request row FIRST to serialize all stage transitions, parallel step executions, and finalization without deadlocks
  SELECT * INTO v_req
  FROM approval_requests
  WHERE id = v_step_lookup.request_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found or tenant mismatch' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Lock the target step under request-level serialization
  SELECT * INTO v_step
  FROM approval_steps
  WHERE id = p_step_id
  FOR UPDATE;

  -- If step is already no longer pending after obtaining request lock, return already processed
  IF v_step.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'step_id', v_step.id,
      'status', v_step.status
    );
  END IF;

  -- 4. Authorization & Delegation Check
  IF v_step.approver_id != p_actor_id THEN
    IF v_delegation_id IS NULL THEN
      SELECT id INTO v_delegation_id
      FROM delegations
      WHERE tenant_id = p_tenant_id
        AND delegator_id = v_step.approver_id
        AND delegate_id = p_actor_id
        AND status = 'active'
        AND (starts_at IS NULL OR starts_at <= v_now)
        AND (ends_at IS NULL OR ends_at > v_now)
      LIMIT 1;

      IF v_delegation_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Actor is neither assigned approver nor active delegate' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- Fetch user snapshots for audit trail
  SELECT name, employee_id INTO v_actor FROM users WHERE id = p_actor_id;
  SELECT name, employee_id INTO v_approver FROM users WHERE id = v_step.approver_id;

  -- 5. Execute Action
  IF v_normalized_action = 'discuss' OR v_normalized_action = 'request_changes' THEN
    UPDATE approval_steps
    SET stance = v_stance,
        outcome = v_outcome,
        was_binding = p_was_binding,
        reservation_note = p_reservation_note,
        reasoning_length = length(COALESCE(p_comment, '')),
        comment = p_comment,
        condition_text = p_condition_text,
        action_source = p_action_source,
        delegation_id = v_delegation_id,
        idempotency_key = p_idempotency_key,
        updated_at = v_now
    WHERE id = p_step_id;

    UPDATE approval_requests
    SET status = 'in_discussion'
    WHERE id = v_step.request_id;

    -- Audit log
    INSERT INTO audit_log (tenant_id, request_id, actor_id, action_type, metadata, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      p_actor_id,
      'step_discussion',
      jsonb_build_object(
        'step_id', p_step_id,
        'stance', p_stance,
        'outcome', p_outcome,
        'was_binding', p_was_binding,
        'reservation_note', p_reservation_note,
        'comment', p_comment,
        'condition', p_condition_text,
        'action_source', p_action_source,
        'idempotency_key', p_idempotency_key
      ),
      v_now
    );

    -- Decision event
    INSERT INTO decision_events (tenant_id, request_id, step_id, event_type, actor_id, stance, outcome, was_binding, event_payload, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      p_step_id,
      'STEP_CHANGES_REQUESTED',
      p_actor_id,
      v_stance,
      v_outcome,
      p_was_binding,
      jsonb_build_object('comment', p_comment, 'condition', p_condition_text),
      v_now
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'discuss',
      'request_status', 'in_discussion',
      'stage_advanced', false,
      'request_id', v_step.request_id
    );

  ELSIF v_normalized_action = 'reject' OR v_normalized_action = 'rejected' THEN
    UPDATE approval_steps
    SET status = 'rejected',
        stance = v_stance,
        outcome = v_outcome,
        was_binding = p_was_binding,
        reservation_note = p_reservation_note,
        reasoning_length = length(COALESCE(p_comment, '')),
        acted_at = v_now,
        acted_by_id = p_actor_id,
        comment = p_comment,
        condition_text = p_condition_text,
        action_source = p_action_source,
        delegation_id = v_delegation_id,
        idempotency_key = p_idempotency_key,
        updated_at = v_now
    WHERE id = p_step_id;

    UPDATE approval_requests
    SET status = 'rejected'
    WHERE id = v_step.request_id;

    -- Audit log
    INSERT INTO audit_log (tenant_id, request_id, actor_id, action_type, metadata, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      p_actor_id,
      'step_rejected',
      jsonb_build_object(
        'step_id', p_step_id,
        'stance', p_stance,
        'outcome', p_outcome,
        'action_source', p_action_source,
        'idempotency_key', p_idempotency_key
      ),
      v_now
    );

    INSERT INTO audit_log (tenant_id, request_id, actor_id, action_type, metadata, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      NULL,
      'request_rejected',
      jsonb_build_object('rejected_at_step_id', p_step_id),
      v_now
    );

    -- Decision events
    INSERT INTO decision_events (tenant_id, request_id, step_id, event_type, actor_id, stance, outcome, was_binding, event_payload, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      p_step_id,
      'STEP_REJECTED',
      p_actor_id,
      v_stance,
      v_outcome,
      p_was_binding,
      jsonb_build_object('comment', p_comment),
      v_now
    );

    INSERT INTO decision_events (tenant_id, request_id, event_type, actor_id, event_payload, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      'REQUEST_REJECTED',
      p_actor_id,
      jsonb_build_object('step_id', p_step_id),
      v_now
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'rejected',
      'request_status', 'rejected',
      'stage_advanced', false,
      'request_id', v_step.request_id
    );

  ELSIF v_normalized_action = 'approve' OR v_normalized_action = 'approved' THEN
    UPDATE approval_steps
    SET status = 'approved',
        stance = v_stance,
        outcome = v_outcome,
        was_binding = p_was_binding,
        reservation_note = p_reservation_note,
        reasoning_length = length(COALESCE(p_comment, '')),
        acted_at = v_now,
        acted_by_id = p_actor_id,
        comment = p_comment,
        condition_text = p_condition_text,
        action_source = p_action_source,
        delegation_id = v_delegation_id,
        idempotency_key = p_idempotency_key,
        updated_at = v_now
    WHERE id = p_step_id;

    -- Audit log
    INSERT INTO audit_log (tenant_id, request_id, actor_id, action_type, metadata, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      p_actor_id,
      'step_approved',
      jsonb_build_object(
        'step_id', p_step_id,
        'stance', p_stance,
        'outcome', p_outcome,
        'was_binding', p_was_binding,
        'reservation_note', p_reservation_note,
        'action_source', p_action_source,
        'idempotency_key', p_idempotency_key
      ),
      v_now
    );

    -- Decision event
    INSERT INTO decision_events (tenant_id, request_id, step_id, event_type, actor_id, stance, outcome, was_binding, event_payload, created_at)
    VALUES (
      p_tenant_id,
      v_step.request_id,
      p_step_id,
      'STEP_APPROVED',
      p_actor_id,
      v_stance,
      v_outcome,
      p_was_binding,
      jsonb_build_object('comment', p_comment, 'condition', p_condition_text),
      v_now
    );

    -- Lock all steps of this request in ID order to prevent race conditions during stage evaluation
    PERFORM id FROM approval_steps
    WHERE request_id = v_step.request_id AND stage_index = v_step.stage_index
    ORDER BY id
    FOR UPDATE;

    SELECT bool_and(status = 'approved') INTO v_all_stage_steps_approved
    FROM approval_steps
    WHERE request_id = v_step.request_id
      AND stage_index = v_step.stage_index
      AND type != 'REFERENCE';

    IF v_all_stage_steps_approved THEN
      -- Find next stage
      SELECT stage_index INTO v_next_stage_index
      FROM approval_steps
      WHERE request_id = v_step.request_id
        AND stage_index > v_step.stage_index
        AND type != 'REFERENCE'
      ORDER BY stage_index ASC
      LIMIT 1;

      IF v_next_stage_index IS NOT NULL THEN
        -- Advance next stage: activate waiting steps with entered_at = v_now
        UPDATE approval_steps
        SET status = 'pending',
            entered_at = v_now,
            updated_at = v_now
        WHERE request_id = v_step.request_id
          AND stage_index = v_next_stage_index
          AND status = 'waiting';

        -- Insert outbox event for stage advance
        INSERT INTO decision_events (tenant_id, request_id, event_type, actor_id, event_payload, created_at)
        VALUES (
          p_tenant_id,
          v_step.request_id,
          'STAGE_ENTERED',
          p_actor_id,
          jsonb_build_object('stage_index', v_next_stage_index),
          v_now
        );

        RETURN jsonb_build_object(
          'success', true,
          'action', 'approved',
          'stage_advanced', true,
          'next_stage_index', v_next_stage_index,
          'finalized', false,
          'request_id', v_step.request_id
        );
      ELSE
        -- All stages approved! Enter FINALIZING state (Two-Phase Finalization)
        UPDATE approval_requests
        SET status = 'FINALIZING',
            finalized_at = v_now
        WHERE id = v_step.request_id;

        INSERT INTO audit_log (tenant_id, request_id, actor_id, action_type, metadata, created_at)
        VALUES (
          p_tenant_id,
          v_step.request_id,
          p_actor_id,
          'request_finalizing',
          jsonb_build_object('status', 'FINALIZING'),
          v_now
        );

        INSERT INTO decision_events (tenant_id, request_id, event_type, actor_id, event_payload, created_at)
        VALUES (
          p_tenant_id,
          v_step.request_id,
          'REQUEST_FINALIZING',
          p_actor_id,
          jsonb_build_object('status', 'FINALIZING'),
          v_now
        );

        RETURN jsonb_build_object(
          'success', true,
          'action', 'approved',
          'stage_advanced', false,
          'finalized', false,
          'needs_seal', true,
          'request_status', 'FINALIZING',
          'request_id', v_step.request_id
        );
      END IF;
    END IF;

    -- Current stage still has pending parallel steps
    RETURN jsonb_build_object(
      'success', true,
      'action', 'approved',
      'stage_advanced', false,
      'finalized', false,
      'request_id', v_step.request_id
    );
  ELSE
    RAISE EXCEPTION 'Unhandled approval action: %', p_action USING ERRCODE = '22023';
  END IF;
END;
$$;

-- Revoke public execution, restrict to service_role (Server-Only RPC Option B)
REVOKE ALL ON FUNCTION sigmago_act_on_step FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_act_on_step FROM anon;
REVOKE ALL ON FUNCTION sigmago_act_on_step FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_act_on_step TO service_role;

-- 3. Create Atomic sigmago_finalize_seal Procedure
CREATE OR REPLACE FUNCTION sigmago_finalize_seal(
  p_request_id UUID,
  p_tenant_id UUID,
  p_checksum TEXT,
  p_canonical_version INT DEFAULT 2,
  p_seal_algorithm TEXT DEFAULT 'SHA-256'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req RECORD;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_checksum IS NULL OR length(trim(p_checksum)) = 0 THEN
    RAISE EXCEPTION 'Checksum cannot be null or empty during finalization' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_req
  FROM approval_requests
  WHERE id = p_request_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent check: already sealed with the exact same checksum
  IF v_req.status = 'approved' AND v_req.checksum_sha256 = p_checksum THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_sealed', true,
      'request_id', p_request_id,
      'status', 'approved',
      'checksum_sha256', v_req.checksum_sha256
    );
  END IF;

  -- Only FINALIZING (or approved) requests can be sealed
  IF v_req.status != 'FINALIZING' AND v_req.status != 'approved' THEN
    RAISE EXCEPTION 'Request is in % status; only FINALIZING requests can be sealed', v_req.status USING ERRCODE = '22023';
  END IF;

  UPDATE approval_requests
  SET status = 'approved',
      checksum_sha256 = p_checksum,
      canonical_version = p_canonical_version,
      seal_algorithm = p_seal_algorithm,
      sealed_at = v_now,
      finalized_at = COALESCE(finalized_at, v_now)
  WHERE id = p_request_id AND tenant_id = p_tenant_id;

  -- Insert audit log
  INSERT INTO audit_log (tenant_id, request_id, actor_id, action_type, metadata, created_at)
  VALUES (
    p_tenant_id,
    p_request_id,
    NULL,
    'request_sealed',
    jsonb_build_object(
      'checksum', p_checksum,
      'canonical_version', p_canonical_version,
      'seal_algorithm', p_seal_algorithm,
      'status', 'approved'
    ),
    v_now
  );

  -- Insert outbox event for seal completion
  INSERT INTO decision_events (tenant_id, request_id, event_type, actor_id, event_payload, created_at)
  VALUES (
    p_tenant_id,
    p_request_id,
    'REQUEST_SEALED',
    NULL,
    jsonb_build_object(
      'checksum_sha256', p_checksum,
      'canonical_version', p_canonical_version,
      'seal_algorithm', p_seal_algorithm,
      'status', 'approved'
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'approved',
    'checksum_sha256', p_checksum,
    'canonical_version', p_canonical_version
  );
END;
$$;

-- Revoke public execution, restrict to service_role (Server-Only RPC Option B)
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM anon;
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_finalize_seal TO service_role;

COMMIT;
