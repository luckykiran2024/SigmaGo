import fs from 'fs';
import path from 'path';

const ddlPath = path.resolve('prisma/migrations/0_init/ddl_base.sql');
const sprint1Path = path.resolve('prisma/migrations/20260905100000_sprint1_baseline/migration.sql');
const sprint3Path = path.resolve('prisma/migrations/20260905300001_rls_identity_and_grant_hardening/migration.sql');

let ddl = fs.readFileSync(ddlPath, 'utf8');
ddl = ddl.split('\n').map(line => {
  if (line.includes('"search_vector" tsvector')) {
    return '    "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector(\'english\'::regconfig, ((subject || \' \'::text) || COALESCE((body_json ->> \'text\'::text), \'\'::text)))) STORED,';
  }
  return line;
}).join('\n');
const sprint1 = fs.readFileSync(sprint1Path, 'utf8');
const sprint3 = fs.readFileSync(sprint3Path, 'utf8');

// Extract sigmago_act_on_step and sigmago_finalize_seal and grants from sprint1
const rpcStart = sprint1.indexOf('CREATE OR REPLACE FUNCTION sigmago_act_on_step');
const rpcEnd = sprint1.indexOf('COMMIT;');
const rpcsAndGrants = sprint1.substring(rpcStart, rpcEnd).trim();

// Extract helper functions, RLS enables, and policies from sprint3
const rlsStart = sprint3.indexOf('-- 1. Identity Resolution Helper Functions');
const rlsEnd = sprint3.indexOf('COMMIT;');
const rlsPolicies = sprint3.substring(rlsStart, rlsEnd).trim();

// Additional tables that need RLS enabled and tenant isolation:
const additionalRls = `
-- Enable RLS across all sensitive tables
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_period_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_transition_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_period_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_footprint_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE approver_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_persons ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "tenant_isolation_delegations_select" ON delegations;
CREATE POLICY "tenant_isolation_delegations_select" ON delegations
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND (delegator_id = current_user_profile_id() OR delegate_id = current_user_profile_id() OR is_current_user_tenant_admin())
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_log_select" ON audit_log;
CREATE POLICY "tenant_isolation_audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_user_tenant_id()
    AND is_current_user_tenant_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_tenants_select" ON tenants;
CREATE POLICY "tenant_isolation_tenants_select" ON tenants
  FOR SELECT TO authenticated
  USING (id = current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_users_select" ON users;
CREATE POLICY "tenant_isolation_users_select" ON users
  FOR SELECT TO authenticated
  USING (tenant_id = current_user_tenant_id());
`;

const fullMigration = `-- =========================================================================
-- Migration: 0_init
-- Description: Complete, reproducible database contract for SigmaGo
-- Includes:
--   1. Required extensions, sequences, auth schema & role stubs
--   2. Enums, tables, columns, defaults, primary keys, indexes, foreign keys
--   3. Identity resolution functions & helper security functions
--   4. Stored procedures (sigmago_act_on_step, sigmago_finalize_seal)
--   5. Security grants/revokes (server-only execution)
--   6. Row-Level Security (RLS) enablement and confidential role-matrix policies
-- =========================================================================

BEGIN;

-- 1. Extensions & Sequences
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SEQUENCE IF NOT EXISTS request_seq START 1;

-- Ensure Supabase Roles exist for Grants/RLS (idempotent in any PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

-- Ensure auth schema and auth.uid() exist
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid 
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text 
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text;
$$;

-- 2. Schema DDL (Enums, Tables, Indexes, Constraints)
${ddl}

-- 3. Identity & Security Helper Functions
${rlsPolicies}

-- 4. Additional Tenant Isolation RLS Policies
${additionalRls}

-- 5. Stored Procedures & Server-Only Execution Grants
${rpcsAndGrants}

COMMIT;
`;

fs.writeFileSync(path.resolve('prisma/migrations/0_init/migration.sql'), fullMigration, 'utf8');
console.log('✅ Generated prisma/migrations/0_init/migration.sql successfully! Total length:', fullMigration.length);
