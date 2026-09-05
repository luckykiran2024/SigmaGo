-- Migration: 20260905500001_authoritative_seal_and_ledger_lock
-- Institutional Hardening: Authoritative Seal RPC, Tenant Ledger Lock, and Concurrency Serialization (Fork Prevention)

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
  v_latest_checksum TEXT;
  v_expected_head TEXT;
  v_event_id UUID;
BEGIN
  -- 1. Input validation: non-null and non-empty checksum
  IF p_checksum IS NULL OR trim(p_checksum) = '' THEN
    RAISE EXCEPTION 'Checksum cannot be null or empty during finalization' USING ERRCODE = '22023';
  END IF;

  -- 2. Concurrency Serialization: Acquire exclusive row lock on tenant ledger
  PERFORM 1 FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id USING ERRCODE = 'P0002';
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

  -- Verify request status: must be in finalizing or pending state
  IF upper(v_req.status) NOT IN ('FINALIZING', 'APPROVED', 'PENDING') THEN
    RAISE EXCEPTION 'Request is in % status; only FINALIZING or PENDING requests can be sealed', v_req.status USING ERRCODE = '22023';
  END IF;

  -- 4. Verify tenant hash-chain linear continuity (Fork Prevention)
  SELECT checksum_sha256 INTO v_latest_checksum
  FROM approval_requests
  WHERE tenant_id = p_tenant_id AND lower(status) = 'approved' AND id <> p_request_id
  ORDER BY finalized_at DESC NULLS LAST, sealed_at DESC NULLS LAST, id DESC
  LIMIT 1;

  IF v_latest_checksum IS NULL THEN
    v_expected_head := 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  ELSE
    v_expected_head := v_latest_checksum;
  END IF;

  IF p_previous_seal_hash IS NOT NULL AND p_previous_seal_hash <> v_expected_head THEN
    RAISE EXCEPTION 'Tenant ledger serialization conflict: expected head %, got %', v_expected_head, p_previous_seal_hash
      USING ERRCODE = '40001';
  END IF;

  -- 5. Atomically transition status to approved and persist seal metadata & ledger hash
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

  -- 6. Exactly-Once Ownership: Insert authoritative REQUEST_SEALED decision event
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
      'checksum', p_checksum,
      'seal_algorithm', p_seal_algorithm,
      'canonical_version', p_canonical_version,
      'previous_seal_hash', COALESCE(p_previous_seal_hash, v_expected_head),
      'seal_key_id', p_key_id,
      'seal_signature_b64', p_seal_signature,
      'sealed_at', v_now
    ),
    v_now
  ) RETURNING id INTO v_event_id;

  -- 7. Record authoritative audit log
  INSERT INTO audit_log (
    tenant_id, request_id, actor_id, action_type, metadata, created_at
  ) VALUES (
    p_tenant_id,
    p_request_id,
    NULL,
    'request_sealed',
    jsonb_build_object(
      'checksum', p_checksum,
      'seal_algorithm', p_seal_algorithm,
      'canonical_version', p_canonical_version,
      'previous_seal_hash', COALESCE(p_previous_seal_hash, v_expected_head),
      'seal_key_id', p_key_id,
      'seal_signature_b64', p_seal_signature,
      'decision_event_id', v_event_id
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'approved',
    'checksum', p_checksum,
    'previous_seal_hash', COALESCE(p_previous_seal_hash, v_expected_head),
    'finalized_at', v_now
  );
END;
$$;

-- Ensure execute permissions
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM anon;
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_finalize_seal TO service_role;
