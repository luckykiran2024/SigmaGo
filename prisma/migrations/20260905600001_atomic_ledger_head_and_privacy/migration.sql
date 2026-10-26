-- Migration: 20260905600001_atomic_ledger_head_and_privacy
-- Institutional Hardening: Atomic Monotonic Tenant Ledger Head, Fork Elimination, Reject PENDING in Seal RPC, and AGGREGATE_ONLY Database Privacy

-- 1. Create tenant_ledger_heads table for atomic linear head tracking
CREATE TABLE IF NOT EXISTS tenant_ledger_heads (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  head_hash TEXT NOT NULL,
  ledger_sequence BIGINT NOT NULL DEFAULT 0,
  last_request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE tenant_ledger_heads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their tenant's ledger head
DROP POLICY IF EXISTS "tenant_isolation_tenant_ledger_heads_select" ON tenant_ledger_heads;
CREATE POLICY "tenant_isolation_tenant_ledger_heads_select" ON tenant_ledger_heads
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

-- Seed tenant_ledger_heads for all existing tenants from their latest sealed request
INSERT INTO tenant_ledger_heads (tenant_id, head_hash, ledger_sequence, last_request_id, updated_at)
SELECT
  t.id,
  COALESCE(latest_req.checksum_sha256, 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000'),
  COALESCE(req_counts.total_sealed, 0),
  latest_req.id,
  clock_timestamp()
FROM tenants t
LEFT JOIN LATERAL (
  SELECT id, checksum_sha256
  FROM approval_requests
  WHERE tenant_id = t.id AND lower(status) = 'approved' AND checksum_sha256 IS NOT NULL
  ORDER BY sealed_at DESC NULLS LAST, finalized_at DESC NULLS LAST, id DESC
  LIMIT 1
) latest_req ON true
LEFT JOIN LATERAL (
  SELECT count(*)::bigint as total_sealed
  FROM approval_requests
  WHERE tenant_id = t.id AND lower(status) = 'approved' AND checksum_sha256 IS NOT NULL
) req_counts ON true
ON CONFLICT (tenant_id) DO NOTHING;

-- 2. Authoritative sigmago_finalize_seal with atomic tenant_ledger_heads locking and PENDING rejection
DROP FUNCTION IF EXISTS sigmago_finalize_seal(UUID, UUID, TEXT, INT, TEXT);
DROP FUNCTION IF EXISTS sigmago_finalize_seal(UUID, UUID, TEXT, INT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sigmago_finalize_seal(
  p_request_id UUID,
  p_tenant_id UUID,
  p_checksum TEXT,
  p_canonical_version INT DEFAULT 2,
  p_seal_algorithm TEXT DEFAULT 'SHA-256',
  p_previous_seal_hash TEXT DEFAULT NULL,
  p_seal_signature TEXT DEFAULT NULL,
  p_key_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_req RECORD;
  v_head_rec RECORD;
  v_expected_head TEXT;
  v_event_id UUID;
  v_next_seq BIGINT;
BEGIN
  -- 1. Input validation: non-null and non-empty checksum
  IF p_checksum IS NULL OR trim(p_checksum) = '' THEN
    RAISE EXCEPTION 'Checksum cannot be null or empty during finalization' USING ERRCODE = '22023';
  END IF;

  -- 2. Concurrency Serialization: Ensure tenant ledger head row exists and lock it exclusively
  INSERT INTO tenant_ledger_heads (tenant_id, head_hash, ledger_sequence)
  VALUES (p_tenant_id, 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000', 0)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT head_hash, ledger_sequence
  INTO v_head_rec
  FROM tenant_ledger_heads
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % ledger head not found', p_tenant_id USING ERRCODE = 'P0002';
  END IF;

  -- 3. Lock and fetch approval request
  SELECT id, status, tenant_id, workflow_id, workflow_version_id, baseline_step_type, resolved_step_type, checksum_sha256
  INTO v_req
  FROM approval_requests
  WHERE id = p_request_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found in tenant %', p_request_id, p_tenant_id USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency check: if already approved with identical checksum, return success
  IF lower(v_req.status) = 'approved' THEN
    IF v_req.checksum_sha256 = p_checksum THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_sealed', true,
        'request_id', p_request_id,
        'status', 'approved',
        'checksum_sha256', v_req.checksum_sha256
      );
    ELSE
      RAISE EXCEPTION 'Request % is already approved with a different checksum', p_request_id USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Verify request status: must be strictly in FINALIZING state (PENDING is rejected)
  IF upper(v_req.status) NOT IN ('FINALIZING', 'APPROVED') THEN
    RAISE EXCEPTION 'Request is in % status; only FINALIZING requests can be sealed', v_req.status USING ERRCODE = '22023';
  END IF;

  -- 4. Verify tenant hash-chain linear continuity using dedicated monotonic ledger head
  v_expected_head := v_head_rec.head_hash;

  IF p_previous_seal_hash IS NOT NULL AND p_previous_seal_hash <> v_expected_head THEN
    RAISE EXCEPTION 'Tenant ledger serialization conflict: expected head %, got %', v_expected_head, p_previous_seal_hash
      USING ERRCODE = '40001';
  END IF;

  v_next_seq := v_head_rec.ledger_sequence + 1;

  -- 5. Atomically advance tenant ledger head
  UPDATE tenant_ledger_heads
  SET
    head_hash = p_checksum,
    ledger_sequence = v_next_seq,
    last_request_id = p_request_id,
    updated_at = v_now
  WHERE tenant_id = p_tenant_id;

  -- 6. Atomically transition status to approved and persist seal metadata & ledger hash
  UPDATE approval_requests
  SET
    status = 'approved',
    checksum_sha256 = p_checksum,
    previous_seal_hash = COALESCE(p_previous_seal_hash, v_expected_head),
    seal_signature_b64 = p_seal_signature,
    seal_key_id = p_key_id,
    canonical_version = p_canonical_version,
    seal_algorithm = p_seal_algorithm,
    sealed_at = v_now,
    finalized_at = COALESCE(finalized_at, v_now)
  WHERE id = p_request_id;

  -- 7. Exactly-Once Ownership: Insert authoritative REQUEST_SEALED decision event
  INSERT INTO decision_events (
    tenant_id,
    request_id,
    workflow_id,
    workflow_version_id,
    event_type,
    event_at,
    baseline_step_type,
    resolved_step_type,
    event_payload,
    created_at
  ) VALUES (
    p_tenant_id,
    p_request_id,
    v_req.workflow_id,
    v_req.workflow_version_id,
    'REQUEST_SEALED',
    v_now,
    v_req.baseline_step_type,
    v_req.resolved_step_type,
    jsonb_build_object(
      'checksum_sha256', p_checksum,
      'canonical_version', p_canonical_version,
      'seal_algorithm', p_seal_algorithm,
      'previous_seal_hash', COALESCE(p_previous_seal_hash, v_expected_head),
      'ledger_sequence', v_next_seq,
      'sealed_at', v_now,
      'workflow_id', v_req.workflow_id,
      'workflow_version_id', v_req.workflow_version_id,
      'resolved_step_type', v_req.resolved_step_type,
      'seal_key_id', p_key_id
    ),
    v_now
  )
  RETURNING id INTO v_event_id;

  -- 8. Record audit log entry
  INSERT INTO audit_log (
    tenant_id,
    request_id,
    actor_id,
    action_type,
    metadata,
    created_at
  ) VALUES (
    p_tenant_id,
    p_request_id,
    NULL,
    'request_sealed',
    jsonb_build_object(
      'checksum_sha256', p_checksum,
      'previous_seal_hash', COALESCE(p_previous_seal_hash, v_expected_head),
      'ledger_sequence', v_next_seq,
      'sealed_at', v_now,
      'decision_event_id', v_event_id
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'approved',
    'checksum_sha256', p_checksum,
    'previous_seal_hash', COALESCE(p_previous_seal_hash, v_expected_head),
    'ledger_sequence', v_next_seq,
    'sealed_at', v_now,
    'decision_event_id', v_event_id
  );
END;
$$;

-- 3. Restrict decision_footprint_metrics SELECT to Tenant Admin and FULL Intelligence grant holders
-- Users with AGGREGATE_ONLY cannot query individual request-level footprint data
DROP POLICY IF EXISTS "tenant_isolation_decision_footprint_metrics_select" ON decision_footprint_metrics;
CREATE POLICY "tenant_isolation_decision_footprint_metrics_select" ON decision_footprint_metrics
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (is_current_user_tenant_admin() OR has_full_intelligence_grant())
  );

-- Ensure execute permissions
REVOKE ALL ON FUNCTION sigmago_finalize_seal(UUID, UUID, TEXT, INT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_finalize_seal(UUID, UUID, TEXT, INT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION sigmago_finalize_seal(UUID, UUID, TEXT, INT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_finalize_seal(UUID, UUID, TEXT, INT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. Create decision_footprint_aggregate_summary view for AGGREGATE_ONLY privacy read model
CREATE OR REPLACE VIEW decision_footprint_aggregate_summary AS
SELECT
  tenant_id,
  count(*)::bigint AS total_nodes,
  round(avg(direct_descendant_count + transitive_descendant_count + based_on_count)::numeric, 2) AS avg_footprint_score,
  sum(direct_descendant_count)::bigint AS total_direct_descendants,
  sum(transitive_descendant_count)::bigint AS total_transitive_descendants,
  sum(exception_child_count)::bigint AS total_exception_references
FROM decision_footprint_metrics
GROUP BY tenant_id;

GRANT SELECT ON decision_footprint_aggregate_summary TO authenticated;
GRANT SELECT ON decision_footprint_aggregate_summary TO service_role;

-- 5. Atomic Workflow & Version Creation/Update Stored Procedure
CREATE OR REPLACE FUNCTION sigmago_save_workflow_atomic(
  p_workflow_id UUID,
  p_tenant_id UUID,
  p_category_id UUID,
  p_name TEXT,
  p_is_locked BOOLEAN,
  p_steps JSONB,
  p_base_step_type "StepType" DEFAULT 'TRANSACTIONAL',
  p_governing_policy_id UUID DEFAULT NULL,
  p_default_sla_hours INT DEFAULT NULL,
  p_classification_rules_json JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_wf_id UUID := p_workflow_id;
  v_wf RECORD;
  v_next_version INT;
  v_result JSONB;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Workflow name cannot be empty' USING ERRCODE = '22023';
  END IF;

  IF v_wf_id IS NULL THEN
    -- CREATE NEW WORKFLOW ATOMICALLY
    INSERT INTO workflows (
      tenant_id,
      category_id,
      name,
      is_locked,
      steps,
      base_step_type,
      governing_policy_id,
      default_sla_hours,
      classification_rules_json,
      current_version_number,
      created_at,
      updated_at
    ) VALUES (
      p_tenant_id,
      p_category_id,
      p_name,
      p_is_locked,
      p_steps,
      COALESCE(p_base_step_type::text, 'TRANSACTIONAL'),
      p_governing_policy_id,
      p_default_sla_hours,
      COALESCE(p_classification_rules_json, '{}'::jsonb),
      1,
      v_now,
      v_now
    )
    RETURNING id INTO v_wf_id;

    -- Insert version 1 snapshot atomically
    INSERT INTO workflow_versions (
      tenant_id,
      workflow_id,
      version_number,
      name_snapshot,
      category_id_snapshot,
      base_step_type,
      governing_policy_id_snapshot,
      steps_json,
      classification_rules_json,
      default_sla_hours,
      created_by,
      effective_from
    ) VALUES (
      p_tenant_id,
      v_wf_id,
      1,
      p_name,
      p_category_id,
      COALESCE(p_base_step_type::text, 'TRANSACTIONAL'),
      p_governing_policy_id,
      p_steps,
      COALESCE(p_classification_rules_json, '{}'::jsonb),
      p_default_sla_hours,
      p_user_id,
      v_now
    );

    v_next_version := 1;
  ELSE
    -- UPDATE EXISTING WORKFLOW ATOMICALLY
    SELECT * INTO v_wf
    FROM workflows
    WHERE id = v_wf_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Workflow % not found in tenant %', v_wf_id, p_tenant_id USING ERRCODE = 'P0002';
    END IF;

    v_next_version := COALESCE(v_wf.current_version_number, 1) + 1;

    -- Expire previous active version
    UPDATE workflow_versions
    SET effective_to = v_now
    WHERE workflow_id = v_wf_id AND tenant_id = p_tenant_id AND effective_to IS NULL;

    -- Insert new immutable version snapshot (Version N+1)
    INSERT INTO workflow_versions (
      tenant_id,
      workflow_id,
      version_number,
      name_snapshot,
      category_id_snapshot,
      base_step_type,
      governing_policy_id_snapshot,
      steps_json,
      classification_rules_json,
      default_sla_hours,
      created_by,
      effective_from
    ) VALUES (
      p_tenant_id,
      v_wf_id,
      v_next_version,
      p_name,
      p_category_id,
      COALESCE(p_base_step_type::text, v_wf.base_step_type, 'TRANSACTIONAL'),
      COALESCE(p_governing_policy_id, v_wf.governing_policy_id),
      p_steps,
      COALESCE(p_classification_rules_json, v_wf.classification_rules_json, '{}'::jsonb),
      COALESCE(p_default_sla_hours, v_wf.default_sla_hours),
      p_user_id,
      v_now
    );

    -- Update parent workflow
    UPDATE workflows
    SET
      category_id = p_category_id,
      name = p_name,
      is_locked = p_is_locked,
      steps = p_steps,
      base_step_type = COALESCE(p_base_step_type::text, base_step_type, 'TRANSACTIONAL'),
      governing_policy_id = p_governing_policy_id,
      default_sla_hours = p_default_sla_hours,
      classification_rules_json = COALESCE(p_classification_rules_json, classification_rules_json, '{}'::jsonb),
      current_version_number = v_next_version,
      updated_at = v_now
    WHERE id = v_wf_id AND tenant_id = p_tenant_id;
  END IF;

  SELECT to_jsonb(w.*) INTO v_result
  FROM workflows w
  WHERE w.id = v_wf_id AND w.tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'workflow_id', v_wf_id,
    'version_number', v_next_version,
    'workflow', v_result
  );
END;
$$;

REVOKE ALL ON FUNCTION sigmago_save_workflow_atomic(UUID, UUID, UUID, TEXT, BOOLEAN, JSONB, "StepType", UUID, INT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_save_workflow_atomic(UUID, UUID, UUID, TEXT, BOOLEAN, JSONB, "StepType", UUID, INT, JSONB, UUID) FROM anon;
REVOKE ALL ON FUNCTION sigmago_save_workflow_atomic(UUID, UUID, UUID, TEXT, BOOLEAN, JSONB, "StepType", UUID, INT, JSONB, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_save_workflow_atomic(UUID, UUID, UUID, TEXT, BOOLEAN, JSONB, "StepType", UUID, INT, JSONB, UUID) TO service_role;

-- 6. Atomic Email Action Token Consumption & Step Execution
CREATE OR REPLACE FUNCTION sigmago_consume_action_token_and_act(
  p_token TEXT,
  p_tenant_id UUID,
  p_intent TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_tok RECORD;
  v_step RECORD;
  v_act_res JSONB;
  v_action TEXT;
  v_stance TEXT;
  v_outcome TEXT;
BEGIN
  -- 1. Atomically lock and retrieve the token
  SELECT id, tenant_id, step_id, request_id, approver_id, expires_at, used_at
  INTO v_tok
  FROM action_tokens
  WHERE token = p_token AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Action token not found or tenant mismatch' USING ERRCODE = 'P0002';
  END IF;

  IF v_tok.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'This action link has already been used' USING ERRCODE = '22023';
  END IF;

  IF v_tok.expires_at < v_now THEN
    RAISE EXCEPTION 'This action link has expired' USING ERRCODE = '22023';
  END IF;

  -- 2. Lock and verify the step is still pending
  SELECT id, status, request_id
  INTO v_step
  FROM approval_steps
  WHERE id = v_tok.step_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated approval step not found' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_step.status) <> 'pending' THEN
    RAISE EXCEPTION 'This step is no longer pending action' USING ERRCODE = '22023';
  END IF;

  -- 3. Execute the action atomically
  IF lower(p_intent) = 'discuss' THEN
    IF p_comment IS NULL OR trim(p_comment) = '' THEN
      RAISE EXCEPTION 'Comment is required for discussion requests' USING ERRCODE = '22023';
    END IF;

    UPDATE approval_requests
    SET status = 'in_discussion'
    WHERE id = v_tok.request_id AND tenant_id = p_tenant_id;

    INSERT INTO audit_log (
      tenant_id,
      request_id,
      actor_id,
      action_type,
      metadata,
      created_at
    ) VALUES (
      p_tenant_id,
      v_tok.request_id,
      v_tok.approver_id,
      'step_discussion',
      jsonb_build_object(
        'step_id', v_tok.step_id,
        'action_source', 'email',
        'comment', p_comment,
        'summary', 'Approver requested discussion via email.'
      ),
      v_now
    );

    v_act_res := jsonb_build_object('success', true, 'action', 'discuss');
  ELSE
    IF lower(p_intent) = 'approve' THEN
      v_action := 'approved';
      v_stance := 'ENDORSED';
      v_outcome := 'APPROVED';
    ELSIF lower(p_intent) = 'reject' THEN
      v_action := 'rejected';
      v_stance := 'REJECTED';
      v_outcome := 'REJECTED';
    ELSE
      RAISE EXCEPTION 'Invalid action intent: %', p_intent USING ERRCODE = '22023';
    END IF;

    -- Call sigmago_act_on_step in the same transaction
    v_act_res := sigmago_act_on_step(
      v_tok.step_id,
      v_tok.approver_id,
      p_tenant_id,
      v_action,
      v_stance,
      v_outcome,
      true,
      NULL,
      p_comment,
      NULL,
      'email',
      NULL,
      'email-token-' || v_tok.id::text
    );
  END IF;

  -- 4. Mark token as consumed atomically
  UPDATE action_tokens
  SET used_at = v_now
  WHERE id = v_tok.id;

  RETURN jsonb_build_object(
    'success', true,
    'token_id', v_tok.id,
    'request_id', v_tok.request_id,
    'step_id', v_tok.step_id,
    'approver_id', v_tok.approver_id,
    'intent', p_intent,
    'consumed_at', v_now,
    'act_result', v_act_res
  );
END;
$$;

REVOKE ALL ON FUNCTION sigmago_consume_action_token_and_act(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_consume_action_token_and_act(TEXT, UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION sigmago_consume_action_token_and_act(TEXT, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_consume_action_token_and_act(TEXT, UUID, TEXT, TEXT) TO service_role;

