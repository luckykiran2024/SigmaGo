-- =========================================================================
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
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DecisionRelationship" AS ENUM ('BASED_ON', 'EXCEPTION_TO', 'REPLACES', 'RENEWAL_OF');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS');

-- CreateEnum
CREATE TYPE "IntelligenceScope" AS ENUM ('AGGREGATE_ONLY', 'FULL');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('REFERENCE', 'CONSULTED', 'INFORMED');

-- CreateEnum
CREATE TYPE "ParticipantState" AS ENUM ('PENDING', 'RESPONDED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DirectoryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPARTED');

-- CreateEnum
CREATE TYPE "ApprovalStance" AS ENUM ('ENDORSED', 'APPROVED_WITH_RESERVATION', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ActionOutcome" AS ENUM ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'CHANGES_REQUESTED', 'DELEGATED');

-- CreateTable
CREATE TABLE "action_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "step_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ref" TEXT NOT NULL DEFAULT ((('REQ-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((nextval('request_seq'::regclass))::text, 4, '0'::text)),
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body_json" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_id" UUID,
    "parent_reference_id" UUID,
    "chain_depth" INTEGER NOT NULL DEFAULT 0,
    "cost_of_not_deciding" TEXT,
    "cost_of_deciding" TEXT,
    "confidence_at_seal" DOUBLE PRECISION,
    "soundness_at_seal" DOUBLE PRECISION,
    "blast_at_seal" INTEGER,
    "checksum_sha256" TEXT,
    "previous_seal_hash" TEXT,
    "seal_signature_b64" TEXT,
    "seal_key_id" TEXT,
    "sealed_at" TIMESTAMPTZ(6),
    "seal_algorithm" TEXT DEFAULT 'SHA-256',
    "canonical_version" INTEGER DEFAULT 2,
    "canonical_form_version" TEXT DEFAULT '1.0',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(6),
    "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((subject || ' '::text) || COALESCE((body_json ->> 'text'::text), ''::text)))) STORED,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "beneficiary_id" UUID,
    "custom_fields" JSONB DEFAULT '{}',
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "review_date" TIMESTAMPTZ(6),
    "renewed_from_id" UUID,
    "classification_override" BOOLEAN NOT NULL DEFAULT false,
    "classification_override_reason" TEXT,
    "workflow_id" UUID,
    "workflow_version_id" UUID,
    "baseline_step_type" "StepType",
    "resolved_step_type" "StepType",
    "classification_source" TEXT,
    "classification_reason" TEXT,
    "expected_sla_hours" INTEGER,
    "expected_decision_at" TIMESTAMPTZ(6),
    "workflow_snapshot" JSONB DEFAULT '{}',

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "request_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stance" "ApprovalStance",
    "outcome" "ActionOutcome",
    "reservation_note" TEXT,
    "reasoning_length" INTEGER NOT NULL DEFAULT 0,
    "was_binding" BOOLEAN NOT NULL DEFAULT true,
    "entered_at" TIMESTAMPTZ(6),
    "acted_at" TIMESTAMPTZ(6),
    "comment" TEXT,
    "condition_text" TEXT,
    "acted_by_id" UUID,
    "delegation_id" UUID,
    "action_source" TEXT,
    "idempotency_key" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage_index" INTEGER NOT NULL DEFAULT 0,
    "recorded_offline" BOOLEAN NOT NULL DEFAULT false,
    "recorded_by_id" UUID,
    "offline_source" TEXT,
    "offline_note" TEXT,
    "evidence_file_id" UUID,
    "ratification_due_at" TIMESTAMPTZ(6),
    "ratification_status" TEXT DEFAULT 'pending',
    "ratified_at" TIMESTAMPTZ(6),

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "mime_type" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID,
    "actor_id" UUID,
    "action_type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "user_agent" TEXT,
    "dkim_verified" BOOLEAN,
    "message_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "default_chain" JSONB NOT NULL DEFAULT '[]',
    "default_sla_hours" INTEGER NOT NULL DEFAULT 72,
    "default_visibility" TEXT NOT NULL DEFAULT 'private',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validity_mode" TEXT NOT NULL DEFAULT 'NONE',
    "step_type" "StepType" NOT NULL DEFAULT 'TRANSACTIONAL',
    "governing_policy_id" UUID,
    "requester_description" TEXT,
    "domain" TEXT DEFAULT 'OTHER',
    "default_validity_days" INTEGER,
    "max_validity_days" INTEGER,
    "review_only" BOOLEAN NOT NULL DEFAULT false,
    "exclude_from_intelligence" BOOLEAN NOT NULL DEFAULT false,
    "who_can_raise" TEXT NOT NULL DEFAULT 'ANYONE',
    "allow_participants" BOOLEAN NOT NULL DEFAULT true,
    "allow_external_participants" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "delegator_id" UUID NOT NULL,
    "delegate_id" UUID NOT NULL,
    "scope_categories" UUID[],
    "amount_threshold" DECIMAL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hrms_sync_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "users_created" INTEGER NOT NULL DEFAULT 0,
    "users_updated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error_details" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "triggered_by_id" UUID,

    CONSTRAINT "hrms_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_nodes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "title" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "custom_domain" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "region" TEXT NOT NULL DEFAULT 'ap-south-2',
    "theme_tokens" JSONB NOT NULL DEFAULT '{}',
    "email_domain" TEXT,
    "dkim_verified" BOOLEAN NOT NULL DEFAULT false,
    "powered_by" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hrms_sync_secret" TEXT,
    "logo_url" TEXT,
    "tenant_settings" JSONB,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "auth_user_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "away_status" BOOLEAN NOT NULL DEFAULT false,
    "hrms_employee_id" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "designation" TEXT,
    "career_level" TEXT,
    "department" TEXT,
    "manager_employee_id" TEXT,
    "employee_id" TEXT,
    "user_settings" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_owners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_grants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "request_id" UUID NOT NULL,
    "grantee_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "view_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "endpoint_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "payload_hash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_attempt" TIMESTAMPTZ(6),
    "response_code" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "url" TEXT NOT NULL,
    "hmac_secret" TEXT NOT NULL,
    "retry_limit" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "base_step_type" "StepType" NOT NULL DEFAULT 'TRANSACTIONAL',
    "governing_policy_id" UUID,
    "default_sla_hours" INTEGER,
    "classification_rules_json" JSONB NOT NULL DEFAULT '{}',
    "opportunity_model_id" UUID,
    "current_version_number" INTEGER NOT NULL DEFAULT 1,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_custom_fields" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "category_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_references" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "target_id" UUID,
    "to_policy_id" UUID,
    "relationship" "DecisionRelationship" NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "reasoning" TEXT,
    "owning_department" TEXT,
    "category_id" UUID,
    "bound_type" TEXT DEFAULT 'NONE',
    "bound_value" DECIMAL,
    "bound_field" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(6),
    "supersedes_id" UUID,
    "created_from_request_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "scope" "IntelligenceScope" NOT NULL DEFAULT 'AGGREGATE_ONLY',
    "granted_by" UUID NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grant_request_id" UUID,
    "reason" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "last_accessed_at" TIMESTAMPTZ(6),
    "access_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "intelligence_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory_persons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "job_title" TEXT,
    "grade" TEXT,
    "department" TEXT,
    "location" TEXT,
    "manager_email" TEXT,
    "status" "DirectoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_service_account" BOOLEAN NOT NULL DEFAULT false,
    "external_id" TEXT,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "directory_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "added_by" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(6),
    "removed_by" UUID,
    "note" TEXT,

    CONSTRAINT "approvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver_authorities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "stage" INTEGER NOT NULL,
    "min_value" DECIMAL,
    "max_value" DECIMAL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "approver_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "added_by" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "state" "ParticipantState" NOT NULL DEFAULT 'PENDING',
    "responded_at" TIMESTAMPTZ(6),
    "comment" TEXT,

    CONSTRAINT "request_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maturity_baselines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "step_type" "StepType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maturity_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exception_reasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exception_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "change_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'support',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_support_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "granted_by" UUID NOT NULL,
    "approved_by" UUID,
    "reason" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_support_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_skips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID,
    "category_id" UUID NOT NULL,
    "step_type" "StepType" NOT NULL,
    "skipped_by" UUID NOT NULL,
    "skipped_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "described_rule" TEXT,

    CONSTRAINT "reference_skips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "category_id_snapshot" UUID,
    "base_step_type" "StepType" NOT NULL,
    "governing_policy_id_snapshot" UUID,
    "steps_json" JSONB NOT NULL DEFAULT '[]',
    "classification_rules_json" JSONB NOT NULL DEFAULT '{}',
    "default_sla_hours" INTEGER,
    "custom_fields_snapshot" JSONB NOT NULL DEFAULT '[]',
    "validity_snapshot" JSONB NOT NULL DEFAULT '{}',
    "opportunity_model_snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(6),

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "workflow_id" UUID,
    "workflow_version_id" UUID,
    "event_type" TEXT NOT NULL,
    "event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "step_id" UUID,
    "baseline_step_type" "StepType",
    "resolved_step_type" "StepType",
    "policy_id" UUID,
    "parent_reference_id" UUID,
    "stance" "ApprovalStance",
    "outcome" "ActionOutcome",
    "was_binding" BOOLEAN,
    "event_payload" JSONB NOT NULL DEFAULT '{}',
    "correlation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_calendar_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "context_type" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "recurring_rule" TEXT,
    "expected_step_types" JSONB NOT NULL DEFAULT '[]',
    "domains" JSONB NOT NULL DEFAULT '[]',
    "workflows" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_period_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period_key" TEXT NOT NULL,
    "comparator_period_key" TEXT NOT NULL,
    "context_id" UUID,
    "domain" TEXT,
    "workflow_id" UUID,
    "step_type" TEXT NOT NULL,
    "total_decisions" INTEGER NOT NULL DEFAULT 0,
    "approved_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "exception_count" INTEGER NOT NULL DEFAULT 0,
    "avg_cycle_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "median_cycle_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "p90_cycle_hours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_period_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_transition_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period_key" TEXT NOT NULL,
    "context_id" UUID,
    "workflow_id" UUID NOT NULL,
    "step_type" TEXT NOT NULL,
    "from_stage" TEXT NOT NULL,
    "to_stage" TEXT NOT NULL,
    "terminal_state" TEXT,
    "transition_count" INTEGER NOT NULL DEFAULT 0,
    "denominator_count" INTEGER NOT NULL DEFAULT 0,
    "observed_probability" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_transition_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_period_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "period_key" TEXT NOT NULL,
    "total_governed_decisions" INTEGER NOT NULL DEFAULT 0,
    "based_on_count" INTEGER NOT NULL DEFAULT 0,
    "exception_count" INTEGER NOT NULL DEFAULT 0,
    "governance_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "distinct_approvers" INTEGER NOT NULL DEFAULT 0,
    "dominant_exception_reason" TEXT,
    "health_state" TEXT NOT NULL DEFAULT 'HEALTHY',
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_period_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_footprint_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "direct_descendant_count" INTEGER NOT NULL DEFAULT 0,
    "transitive_descendant_count" INTEGER NOT NULL DEFAULT 0,
    "based_on_count" INTEGER NOT NULL DEFAULT 0,
    "exception_child_count" INTEGER NOT NULL DEFAULT 0,
    "replacement_count" INTEGER NOT NULL DEFAULT 0,
    "renewal_count" INTEGER NOT NULL DEFAULT 0,
    "cross_domain_reach" INTEGER NOT NULL DEFAULT 0,
    "persistence_days" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_footprint_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_signals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "signal_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "workflow_id" UUID,
    "policy_id" UUID,
    "period_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "factual_summary" TEXT NOT NULL,
    "pattern_summary" TEXT,
    "interpretation" TEXT,
    "recommendation" TEXT,
    "magnitude" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "persistence" INTEGER NOT NULL DEFAULT 1,
    "impact" TEXT DEFAULT 'MEDIUM',
    "confidence" TEXT NOT NULL DEFAULT 'DEVELOPING',
    "confidence_basis" JSONB NOT NULL DEFAULT '{}',
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactional_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "transactional_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "action_tokens_token_key" ON "action_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_ref_key" ON "approval_requests"("ref");

-- CreateIndex
CREATE INDEX "approval_requests_owner_id_idx" ON "approval_requests"("owner_id");

-- CreateIndex
CREATE INDEX "approval_requests_search_idx" ON "approval_requests" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "approval_requests_tenant_id_category_id_idx" ON "approval_requests"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "approval_requests_tenant_id_status_idx" ON "approval_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_requests_tenant_owner" ON "approval_requests"("tenant_id", "owner_id");

-- CreateIndex
CREATE INDEX "idx_approval_requests_beneficiary" ON "approval_requests"("beneficiary_id");

-- CreateIndex
CREATE INDEX "idx_approval_requests_valid_until" ON "approval_requests"("valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_idempotency_key_key" ON "approval_steps"("idempotency_key");

-- CreateIndex
CREATE INDEX "approval_steps_approver_id_idx" ON "approval_steps"("approver_id");

-- CreateIndex
CREATE INDEX "approval_steps_request_id_order_index_idx" ON "approval_steps"("request_id", "order_index");

-- CreateIndex
CREATE INDEX "approval_steps_status_idx" ON "approval_steps"("status");

-- CreateIndex
CREATE INDEX "audit_log_request_id_idx" ON "audit_log"("request_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_created_at_idx" ON "audit_log"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_request" ON "audit_log"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_name_key" ON "categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "hrms_sync_log_tenant_id_started_at_idx" ON "hrms_sync_log"("tenant_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "org_nodes_tenant_id_parent_id_idx" ON "org_nodes"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_nodes_tenant_id_user_id_key" ON "org_nodes"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");

-- CreateIndex
CREATE INDEX "idx_users_auth" ON "users"("auth_user_id");

-- CreateIndex
CREATE INDEX "idx_users_email_tenant" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "users_employee_id_idx" ON "users"("tenant_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "policy_owners_tenant_id_policy_id_user_id_key" ON "policy_owners"("tenant_id", "policy_id", "user_id");

-- CreateIndex
CREATE INDEX "view_grants_request_id_status_idx" ON "view_grants"("request_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "view_grants_request_id_grantee_id_key" ON "view_grants"("request_id", "grantee_id");

-- CreateIndex
CREATE INDEX "workflows_tenant_id_category_id_idx" ON "workflows"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "idx_custom_fields_tenant" ON "tenant_custom_fields"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_custom_fields_tenant_id_key_key" ON "tenant_custom_fields"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "decision_references_tenant_id_source_id_idx" ON "decision_references"("tenant_id", "source_id");

-- CreateIndex
CREATE INDEX "decision_references_tenant_id_target_id_idx" ON "decision_references"("tenant_id", "target_id");

-- CreateIndex
CREATE INDEX "decision_references_tenant_id_to_policy_id_relationship_cre_idx" ON "decision_references"("tenant_id", "to_policy_id", "relationship", "created_at");

-- CreateIndex
CREATE INDEX "policies_tenant_id_status_idx" ON "policies"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "policies_tenant_id_effective_from_effective_to_idx" ON "policies"("tenant_id", "effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "intelligence_grants_tenant_id_revoked_at_expires_at_idx" ON "intelligence_grants"("tenant_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "intelligence_grants_tenant_id_email_key" ON "intelligence_grants"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "directory_persons_tenant_id_status_idx" ON "directory_persons"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "directory_persons_tenant_id_manager_email_idx" ON "directory_persons"("tenant_id", "manager_email");

-- CreateIndex
CREATE UNIQUE INDEX "directory_persons_tenant_id_email_key" ON "directory_persons"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "approvers_tenant_id_removed_at_idx" ON "approvers"("tenant_id", "removed_at");

-- CreateIndex
CREATE UNIQUE INDEX "approvers_tenant_id_email_key" ON "approvers"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "approver_authorities_tenant_id_category_id_idx" ON "approver_authorities"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "approver_authorities_tenant_id_category_id_stage_approver_i_key" ON "approver_authorities"("tenant_id", "category_id", "stage", "approver_id");

-- CreateIndex
CREATE INDEX "request_participants_tenant_id_request_id_idx" ON "request_participants"("tenant_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_participants_tenant_id_request_id_email_role_key" ON "request_participants"("tenant_id", "request_id", "email", "role");

-- CreateIndex
CREATE UNIQUE INDEX "maturity_baselines_tenant_id_step_type_key" ON "maturity_baselines"("tenant_id", "step_type");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "reference_skips_tenant_id_category_id_idx" ON "reference_skips"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "workflow_versions_tenant_id_workflow_id_effective_from_idx" ON "workflow_versions"("tenant_id", "workflow_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_tenant_id_workflow_id_version_number_key" ON "workflow_versions"("tenant_id", "workflow_id", "version_number");

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_event_at_idx" ON "decision_events"("tenant_id", "event_at" DESC);

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_request_id_event_at_idx" ON "decision_events"("tenant_id", "request_id", "event_at");

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_workflow_id_event_at_idx" ON "decision_events"("tenant_id", "workflow_id", "event_at");

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_resolved_step_type_event_at_idx" ON "decision_events"("tenant_id", "resolved_step_type", "event_at");

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_event_type_event_at_idx" ON "decision_events"("tenant_id", "event_type", "event_at");

-- CreateIndex
CREATE INDEX "decision_events_tenant_id_policy_id_event_at_idx" ON "decision_events"("tenant_id", "policy_id", "event_at");

-- CreateIndex
CREATE INDEX "decision_calendar_events_tenant_id_starts_at_ends_at_idx" ON "decision_calendar_events"("tenant_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "support_tickets_tenant_id_status_idx" ON "support_tickets"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_decision_period_metric" ON "decision_period_metrics"("tenant_id", "period_key", "workflow_id", "step_type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stage_transition_metric" ON "stage_transition_metrics"("tenant_id", "period_key", "workflow_id", "from_stage", "to_stage");

-- CreateIndex
CREATE UNIQUE INDEX "uq_policy_period_metric" ON "policy_period_metrics"("tenant_id", "policy_id", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_decision_footprint_metric" ON "decision_footprint_metrics"("tenant_id", "request_id");

-- CreateIndex
CREATE INDEX "intelligence_signals_tenant_id_status_period_key_idx" ON "intelligence_signals"("tenant_id", "status", "period_key");

-- CreateIndex
CREATE INDEX "intelligence_signals_tenant_id_signal_type_period_key_idx" ON "intelligence_signals"("tenant_id", "signal_type", "period_key");

-- CreateIndex
CREATE INDEX "idx_outbox_pending" ON "transactional_outbox"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_outbox_tenant" ON "transactional_outbox"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "approval_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "approval_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_renewed_from_id_fkey" FOREIGN KEY ("renewed_from_id") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_acted_by_id_fkey" FOREIGN KEY ("acted_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_evidence_file_id_fkey" FOREIGN KEY ("evidence_file_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_delegation_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "delegations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_governing_policy_id_fkey" FOREIGN KEY ("governing_policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegate_id_fkey" FOREIGN KEY ("delegate_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrms_sync_log" ADD CONSTRAINT "hrms_sync_log_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrms_sync_log" ADD CONSTRAINT "hrms_sync_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_nodes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "policy_owners" ADD CONSTRAINT "policy_owners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_owners" ADD CONSTRAINT "policy_owners_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_owners" ADD CONSTRAINT "policy_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_grants" ADD CONSTRAINT "view_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "view_grants" ADD CONSTRAINT "view_grants_grantee_id_fkey" FOREIGN KEY ("grantee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "view_grants" ADD CONSTRAINT "view_grants_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_custom_fields" ADD CONSTRAINT "tenant_custom_fields_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_custom_fields" ADD CONSTRAINT "tenant_custom_fields_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "decision_references" ADD CONSTRAINT "decision_references_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_references" ADD CONSTRAINT "decision_references_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_references" ADD CONSTRAINT "decision_references_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_references" ADD CONSTRAINT "decision_references_to_policy_id_fkey" FOREIGN KEY ("to_policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_references" ADD CONSTRAINT "decision_references_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_grants" ADD CONSTRAINT "intelligence_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_grants" ADD CONSTRAINT "intelligence_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory_persons" ADD CONSTRAINT "directory_persons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvers" ADD CONSTRAINT "approvers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_authorities" ADD CONSTRAINT "approver_authorities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_authorities" ADD CONSTRAINT "approver_authorities_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "approvers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_authorities" ADD CONSTRAINT "approver_authorities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_participants" ADD CONSTRAINT "request_participants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_participants" ADD CONSTRAINT "request_participants_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maturity_baselines" ADD CONSTRAINT "maturity_baselines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_reasons" ADD CONSTRAINT "exception_reasons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_changes" ADD CONSTRAINT "config_changes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_grants" ADD CONSTRAINT "platform_support_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_integrations" ADD CONSTRAINT "platform_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_skips" ADD CONSTRAINT "reference_skips_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_skips" ADD CONSTRAINT "reference_skips_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_skips" ADD CONSTRAINT "reference_skips_skipped_by_fkey" FOREIGN KEY ("skipped_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_skips" ADD CONSTRAINT "reference_skips_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_events" ADD CONSTRAINT "decision_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_calendar_events" ADD CONSTRAINT "decision_calendar_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_period_metrics" ADD CONSTRAINT "decision_period_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transition_metrics" ADD CONSTRAINT "stage_transition_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_period_metrics" ADD CONSTRAINT "policy_period_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_footprint_metrics" ADD CONSTRAINT "decision_footprint_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_signals" ADD CONSTRAINT "intelligence_signals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactional_outbox" ADD CONSTRAINT "transactional_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- 3. Identity & Security Helper Functions
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

-- 4. Additional Tenant Isolation RLS Policies

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


-- 5. Stored Procedures & Server-Only Execution Grants
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
  p_seal_algorithm TEXT DEFAULT 'SHA-256',
  p_previous_seal_hash TEXT DEFAULT NULL,
  p_seal_signature TEXT DEFAULT NULL,
  p_key_id TEXT DEFAULT NULL
) RETURNS JSONB
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

-- Revoke public execution, restrict to service_role (Server-Only RPC Option B)
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM PUBLIC;
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM anon;
REVOKE ALL ON FUNCTION sigmago_finalize_seal FROM authenticated;
GRANT EXECUTE ON FUNCTION sigmago_finalize_seal TO service_role;

COMMIT;
