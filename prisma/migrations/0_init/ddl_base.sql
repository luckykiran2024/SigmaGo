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
    "sealed_at" TIMESTAMPTZ(6),
    "seal_algorithm" TEXT DEFAULT 'SHA-256',
    "canonical_version" INTEGER DEFAULT 2,
    "canonical_form_version" TEXT DEFAULT '1.0',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(6),
    "search_vector" tsvector DEFAULT to_tsvector('english'::regconfig, ((subject || ' '::text) || COALESCE((body_json ->> 'text'::text), ''::text))),
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

