-- Migration: 20260905300001_rls_identity_and_grant_hardening
-- Description: Airtight RLS identity model alignment (current_user_profile_id) and confidentiality hardening

BEGIN;

-- 1. Identity Resolution Helper Functions
CREATE OR REPLACE FUNCTION current_user_profile_id() 
RETURNS UUID
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp 
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_tenant_id() 
RETURNS UUID
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp 
AS $$
  SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_current_user_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION has_active_intelligence_grant()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM intelligence_grants g
    JOIN users u ON lower(u.email) = lower(g.email) AND u.tenant_id = g.tenant_id
    WHERE u.id = current_user_profile_id()
      AND g.tenant_id = current_user_tenant_id()
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > clock_timestamp())
      AND g.scope IN ('AGGREGATE_ONLY', 'FULL')
  );
$$;

CREATE OR REPLACE FUNCTION has_full_intelligence_grant()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM intelligence_grants g
    JOIN users u ON lower(u.email) = lower(g.email) AND u.tenant_id = g.tenant_id
    WHERE u.id = current_user_profile_id()
      AND g.tenant_id = current_user_tenant_id()
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > clock_timestamp())
      AND g.scope = 'FULL'
  );
$$;

-- 2. Hardened Approval Requests RLS
DROP POLICY IF EXISTS "tenant_isolation_approval_requests_select" ON approval_requests;
CREATE POLICY "tenant_isolation_approval_requests_select" ON approval_requests
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (
      owner_id = current_user_profile_id()
      OR beneficiary_id = current_user_profile_id()
      OR is_current_user_tenant_admin()
      OR has_full_intelligence_grant()
      OR EXISTS (
        SELECT 1 FROM approval_steps s
        WHERE s.request_id = approval_requests.id
          AND (
            s.approver_id = current_user_profile_id()
            OR s.approver_id IN (
              SELECT d.delegator_id FROM delegations d
              WHERE d.delegate_id = current_user_profile_id() AND d.status = 'active'
            )
          )
      )
      OR EXISTS (
        SELECT 1 FROM request_participants p
        WHERE p.request_id = approval_requests.id
          AND p.email = (SELECT email FROM users WHERE id = current_user_profile_id())
      )
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_approval_requests_insert" ON approval_requests;
CREATE POLICY "tenant_isolation_approval_requests_insert" ON approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND owner_id = current_user_profile_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_approval_requests_update" ON approval_requests;
CREATE POLICY "tenant_isolation_approval_requests_update" ON approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (owner_id = current_user_profile_id() OR is_current_user_tenant_admin())
  );

-- 3. Hardened Approval Steps RLS (Confidentiality: Only relevant participants)
DROP POLICY IF EXISTS "tenant_isolation_approval_steps_select" ON approval_steps;
CREATE POLICY "tenant_isolation_approval_steps_select" ON approval_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests r
      WHERE r.id = approval_steps.request_id
        AND r.tenant_id = current_user_tenant_id()
        AND (
          r.owner_id = current_user_profile_id()
          OR is_current_user_tenant_admin()
          OR has_full_intelligence_grant()
          OR approval_steps.approver_id = current_user_profile_id()
          OR approval_steps.approver_id IN (
            SELECT d.delegator_id FROM delegations d
            WHERE d.delegate_id = current_user_profile_id() AND d.status = 'active'
          )
        )
    )
  );

-- 4. Hardened Attachments RLS
DROP POLICY IF EXISTS "tenant_isolation_attachments_select" ON attachments;
CREATE POLICY "tenant_isolation_attachments_select" ON attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests r
      WHERE r.id = attachments.request_id
        AND r.tenant_id = current_user_tenant_id()
        AND (
          r.owner_id = current_user_profile_id()
          OR is_current_user_tenant_admin()
          OR has_full_intelligence_grant()
          OR EXISTS (
            SELECT 1 FROM approval_steps s
            WHERE s.request_id = r.id
              AND (
                s.approver_id = current_user_profile_id()
                OR s.approver_id IN (
                  SELECT d.delegator_id FROM delegations d
                  WHERE d.delegate_id = current_user_profile_id() AND d.status = 'active'
                )
              )
          )
        )
    )
  );

-- 5. Hardened Request Participants RLS
DROP POLICY IF EXISTS "tenant_isolation_request_participants_select" ON request_participants;
CREATE POLICY "tenant_isolation_request_participants_select" ON request_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests r
      WHERE r.id = request_participants.request_id
        AND r.tenant_id = current_user_tenant_id()
        AND (
          r.owner_id = current_user_profile_id()
          OR is_current_user_tenant_admin()
          OR has_full_intelligence_grant()
          OR request_participants.email = (SELECT email FROM users WHERE id = current_user_profile_id())
          OR EXISTS (
            SELECT 1 FROM approval_steps s
            WHERE s.request_id = r.id AND s.approver_id = current_user_profile_id()
          )
        )
    )
  );

-- 6. Hardened Organisational Intelligence Tables (Gated to Admin or Active Intelligence Grants)
DROP POLICY IF EXISTS "tenant_isolation_decision_period_metrics_select" ON decision_period_metrics;
CREATE POLICY "tenant_isolation_decision_period_metrics_select" ON decision_period_metrics
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (is_current_user_tenant_admin() OR has_active_intelligence_grant())
  );

DROP POLICY IF EXISTS "tenant_isolation_stage_transition_metrics_select" ON stage_transition_metrics;
CREATE POLICY "tenant_isolation_stage_transition_metrics_select" ON stage_transition_metrics
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (is_current_user_tenant_admin() OR has_active_intelligence_grant())
  );

DROP POLICY IF EXISTS "tenant_isolation_policy_period_metrics_select" ON policy_period_metrics;
CREATE POLICY "tenant_isolation_policy_period_metrics_select" ON policy_period_metrics
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (is_current_user_tenant_admin() OR has_active_intelligence_grant())
  );

DROP POLICY IF EXISTS "tenant_isolation_decision_footprint_metrics_select" ON decision_footprint_metrics;
CREATE POLICY "tenant_isolation_decision_footprint_metrics_select" ON decision_footprint_metrics
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (is_current_user_tenant_admin() OR has_active_intelligence_grant())
  );

DROP POLICY IF EXISTS "tenant_isolation_intelligence_signals_select" ON intelligence_signals;
CREATE POLICY "tenant_isolation_intelligence_signals_select" ON intelligence_signals
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (is_current_user_tenant_admin() OR has_active_intelligence_grant())
  );

-- 7. Hardened Delegations RLS
DROP POLICY IF EXISTS "tenant_isolation_delegations_select" ON delegations;
CREATE POLICY "tenant_isolation_delegations_select" ON delegations
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (
      delegator_id = current_user_profile_id()
      OR delegate_id = current_user_profile_id()
      OR is_current_user_tenant_admin()
    )
  );

COMMIT;
