-- Migration: 20260905400001_tenant_hash_chain
-- Institutional Hardening: Cryptographic Tenant Hash-Chain (previous_seal_hash) and Asymmetric PKI signatures

-- 1. AlterTable approval_requests to add previous_seal_hash and PKI signature columns
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "previous_seal_hash" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "seal_signature_b64" TEXT;
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "seal_key_id" TEXT;

-- 2. Create index for sequential ledger traversal by tenant
CREATE INDEX IF NOT EXISTS "idx_approval_requests_tenant_finalized" ON "approval_requests" ("tenant_id", "finalized_at" DESC);

-- 3. Update sigmago_finalize_seal to atomically record previous_seal_hash, seal_signature_b64, seal_key_id
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
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_req RECORD;
BEGIN
  -- 1. Lock and fetch approval request
  SELECT id, status, tenant_id, workflow_id, workflow_version_id, baseline_step_type, resolved_step_type
  INTO v_req
  FROM approval_requests
  WHERE id = p_request_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found in tenant %', p_request_id, p_tenant_id USING ERRCODE = 'P0002';
  END IF;

  IF v_req.status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_sealed', true,
      'request_id', p_request_id,
      'status', 'approved'
    );
  END IF;

  -- 2. Atomically transition status to approved and persist seal metadata & ledger hash
  UPDATE approval_requests
  SET
    status = 'approved',
    checksum_sha256 = p_checksum,
    previous_seal_hash = p_previous_seal_hash,
    seal_signature_b64 = p_seal_signature,
    seal_key_id = p_key_id,
    canonical_version = p_canonical_version,
    seal_algorithm = p_seal_algorithm,
    sealed_at = v_now,
    finalized_at = v_now
  WHERE id = p_request_id;

  -- 3. Record audit log
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
      'previous_seal_hash', p_previous_seal_hash,
      'seal_key_id', p_key_id,
      'seal_signature_b64', p_seal_signature
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', 'approved',
    'checksum', p_checksum,
    'previous_seal_hash', p_previous_seal_hash,
    'finalized_at', v_now
  );
END;
$$;
