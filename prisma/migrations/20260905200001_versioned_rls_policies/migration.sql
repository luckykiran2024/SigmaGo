-- Migration: 20260905200001_versioned_rls_policies
-- Description: Comprehensive Row-Level Security (RLS) Policies implementing the RLS Role Matrix (Sprint 3)

BEGIN;

-- Helper function to fetch tenant_id of current authenticated user safely
CREATE OR REPLACE FUNCTION current_user_tenant_id() 
RETURNS UUID
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp 
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper function to check if current user is admin/owner
CREATE OR REPLACE FUNCTION is_current_user_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
  );
$$;

-------------------------------------------------------------
-- 1. approval_requests
-------------------------------------------------------------
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_approval_requests_select" ON approval_requests;
CREATE POLICY "tenant_isolation_approval_requests_select" ON approval_requests
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (
      owner_id = auth.uid()
      OR beneficiary_id = auth.uid()
      OR is_current_user_tenant_admin()
      OR EXISTS (
        SELECT 1 FROM approval_steps s
        WHERE s.request_id = approval_requests.id
          AND (
            s.approver_id = auth.uid()
            OR s.approver_id IN (
              SELECT d.delegator_id FROM delegations d
              WHERE d.delegate_id = auth.uid() AND d.status = 'active'
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_approval_requests_insert" ON approval_requests;
CREATE POLICY "tenant_isolation_approval_requests_insert" ON approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "tenant_isolation_approval_requests_update" ON approval_requests;
CREATE POLICY "tenant_isolation_approval_requests_update" ON approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (owner_id = auth.uid() OR is_current_user_tenant_admin())
  );

-------------------------------------------------------------
-- 2. approval_steps (Child Table Isolation via Request)
-------------------------------------------------------------
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_approval_steps_select" ON approval_steps;
CREATE POLICY "tenant_isolation_approval_steps_select" ON approval_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests r
      WHERE r.id = approval_steps.request_id
        AND r.tenant_id = current_user_tenant_id()
    )
  );

-------------------------------------------------------------
-- 3. workflows & workflow_versions
-------------------------------------------------------------
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_workflows_select" ON workflows;
CREATE POLICY "tenant_isolation_workflows_select" ON workflows
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_workflows_admin" ON workflows;
CREATE POLICY "tenant_isolation_workflows_admin" ON workflows
  FOR ALL TO authenticated
  USING (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin())
  WITH CHECK (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin());

DROP POLICY IF EXISTS "tenant_isolation_workflow_versions_select" ON workflow_versions;
CREATE POLICY "tenant_isolation_workflow_versions_select" ON workflow_versions
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_workflow_versions_admin" ON workflow_versions;
CREATE POLICY "tenant_isolation_workflow_versions_admin" ON workflow_versions
  FOR ALL TO authenticated
  USING (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin())
  WITH CHECK (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin());

-------------------------------------------------------------
-- 4. policies & categories
-------------------------------------------------------------
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_policies_select" ON policies;
CREATE POLICY "tenant_isolation_policies_select" ON policies
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_policies_admin" ON policies;
CREATE POLICY "tenant_isolation_policies_admin" ON policies
  FOR ALL TO authenticated
  USING (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin())
  WITH CHECK (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin());

DROP POLICY IF EXISTS "tenant_isolation_categories_select" ON categories;
CREATE POLICY "tenant_isolation_categories_select" ON categories
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_categories_admin" ON categories;
CREATE POLICY "tenant_isolation_categories_admin" ON categories
  FOR ALL TO authenticated
  USING (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin())
  WITH CHECK (tenant_id = current_user_tenant_id() AND is_current_user_tenant_admin());

-------------------------------------------------------------
-- 5. decision_references, request_participants, attachments
-------------------------------------------------------------
ALTER TABLE decision_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_decision_references_select" ON decision_references;
CREATE POLICY "tenant_isolation_decision_references_select" ON decision_references
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_request_participants_select" ON request_participants;
CREATE POLICY "tenant_isolation_request_participants_select" ON request_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests r
      WHERE r.id = request_participants.request_id
        AND r.tenant_id = current_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "tenant_isolation_attachments_select" ON attachments;
CREATE POLICY "tenant_isolation_attachments_select" ON attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests r
      WHERE r.id = attachments.request_id
        AND r.tenant_id = current_user_tenant_id()
    )
  );

-------------------------------------------------------------
-- 6. Analytical Aggregates & Signals
-------------------------------------------------------------
ALTER TABLE decision_period_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_transition_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_period_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_footprint_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_decision_period_metrics_select" ON decision_period_metrics;
CREATE POLICY "tenant_isolation_decision_period_metrics_select" ON decision_period_metrics
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_stage_transition_metrics_select" ON stage_transition_metrics;
CREATE POLICY "tenant_isolation_stage_transition_metrics_select" ON stage_transition_metrics
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_policy_period_metrics_select" ON policy_period_metrics;
CREATE POLICY "tenant_isolation_policy_period_metrics_select" ON policy_period_metrics
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_decision_footprint_metrics_select" ON decision_footprint_metrics;
CREATE POLICY "tenant_isolation_decision_footprint_metrics_select" ON decision_footprint_metrics
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_intelligence_signals_select" ON intelligence_signals;
CREATE POLICY "tenant_isolation_intelligence_signals_select" ON intelligence_signals
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());

-------------------------------------------------------------
-- 7. delegations & audit_log
-------------------------------------------------------------
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_delegations_select" ON delegations;
CREATE POLICY "tenant_isolation_delegations_select" ON delegations
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (delegator_id = auth.uid() OR delegate_id = auth.uid() OR is_current_user_tenant_admin())
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_log_select" ON audit_log;
CREATE POLICY "tenant_isolation_audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_current_user_tenant_admin()
  );

COMMIT;
