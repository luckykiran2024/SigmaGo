# Database Schema Reconciliation & Baseline Report (Sprint 3.0)

**Generated At**: 2026-09-05T05:18:38.031Z
**Environment**: Supabase PostgreSQL Live Database

## 1. Summary of Database Tables & RLS Status

| Table Name | RLS Enabled | Policies Count | Prisma Model Synced | Column Count |
| :--- | :---: | :---: | :---: | :---: |
| `_prisma_migrations` | ✅ YES | 0 | ⚠️ Missing in Prisma | 8 |
| `action_tokens` | ✅ YES | 0 | ⚠️ Missing in Prisma | 9 |
| `approval_requests` | ✅ YES | 3 | ✅ Synced | 39 |
| `approval_steps` | ✅ YES | 2 | ✅ Synced | 28 |
| `approver_authorities` | ✅ YES | 0 | ✅ Synced | 8 |
| `approvers` | ✅ YES | 0 | ✅ Synced | 8 |
| `attachments` | ✅ YES | 0 | ✅ Synced | 9 |
| `audit_log` | ✅ YES | 2 | ✅ Synced | 11 |
| `categories` | ✅ YES | 2 | ✅ Synced | 19 |
| `decision_calendar_events` | ✅ YES | 0 | ✅ Synced | 13 |
| `decision_events` | ✅ YES | 0 | ✅ Synced | 19 |
| `decision_footprint_metrics` | ✅ YES | 0 | ✅ Synced | 13 |
| `decision_period_metrics` | ✅ YES | 0 | ✅ Synced | 17 |
| `decision_references` | ✅ YES | 0 | ✅ Synced | 9 |
| `delegations` | ✅ YES | 2 | ✅ Synced | 11 |
| `directory_persons` | ✅ YES | 0 | ✅ Synced | 13 |
| `hrms_sync_log` | ✅ YES | 0 | ✅ Synced | 6 |
| `intelligence_grants` | ✅ YES | 0 | ✅ Synced | 14 |
| `intelligence_signals` | ✅ YES | 0 | ✅ Synced | 22 |
| `maturity_baselines` | ✅ YES | 0 | ✅ Synced | 5 |
| `org_nodes` | ✅ YES | 2 | ✅ Synced | 7 |
| `policies` | ✅ YES | 0 | ✅ Synced | 17 |
| `policy_period_metrics` | ✅ YES | 0 | ✅ Synced | 12 |
| `reference_skips` | ✅ YES | 0 | ✅ Synced | 9 |
| `request_participants` | ✅ YES | 0 | ✅ Synced | 12 |
| `stage_transition_metrics` | ✅ YES | 0 | ✅ Synced | 14 |
| `support_tickets` | ✅ YES | 0 | ✅ Synced | 11 |
| `tenant_custom_fields` | ✅ YES | 4 | ✅ Synced | 12 |
| `tenants` | ✅ YES | 0 | ✅ Synced | 14 |
| `transactional_outbox` | ✅ YES | 1 | ✅ Synced | 11 |
| `users` | ✅ YES | 1 | ✅ Synced | 16 |
| `view_grants` | ✅ YES | 0 | ✅ Synced | 7 |
| `webhook_deliveries` | ✅ YES | 0 | ✅ Synced | 9 |
| `webhook_endpoints` | ✅ YES | 0 | ✅ Synced | 8 |
| `workflow_versions` | ✅ YES | 0 | ✅ Synced | 18 |
| `workflows` | ✅ YES | 0 | ✅ Synced | 16 |

## 2. Table-by-Table Field Reconciliation

### Table: `_prisma_migrations`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `character varying` | NO | `none` |
| `checksum` | `character varying` | NO | `none` |
| `finished_at` | `timestamp with time zone` | YES | `none` |
| `migration_name` | `character varying` | NO | `none` |
| `logs` | `text` | YES | `none` |
| `rolled_back_at` | `timestamp with time zone` | YES | `none` |
| `started_at` | `timestamp with time zone` | NO | `now()` |
| `applied_steps_count` | `integer` | NO | `0` |

### Table: `action_tokens`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `token` | `text` | NO | `none` |
| `step_id` | `uuid` | NO | `none` |
| `approver_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | NO | `none` |
| `tenant_id` | `uuid` | NO | `none` |
| `used_at` | `timestamp with time zone` | YES | `none` |
| `expires_at` | `timestamp with time zone` | NO | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `approval_requests`

- **RLS Enabled**: Yes
- **Existing Policies**: `can_see_request` (SELECT), `owner_creates_request` (INSERT), `owner_updates_draft` (UPDATE)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `ref` | `text` | NO | `((('REQ-'::text || to_char(now(), 'YYYY'::text)) || '-'::text) || lpad((nextval('request_seq'::regclass))::text, 4, '0'::text))` |
| `tenant_id` | `uuid` | NO | `none` |
| `owner_id` | `uuid` | NO | `none` |
| `category_id` | `uuid` | NO | `none` |
| `subject` | `text` | NO | `none` |
| `body_json` | `jsonb` | NO | `'{}'::jsonb` |
| `status` | `text` | NO | `'draft'::text` |
| `visibility` | `text` | NO | `'private'::text` |
| `version` | `integer` | NO | `1` |
| `parent_id` | `uuid` | YES | `none` |
| `checksum_sha256` | `text` | YES | `none` |
| `conditions` | `jsonb` | NO | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `finalized_at` | `timestamp with time zone` | YES | `none` |
| `search_vector` | `tsvector` | YES | `none` |
| `archived` | `boolean` | NO | `false` |
| `beneficiary_id` | `uuid` | YES | `none` |
| `custom_fields` | `jsonb` | YES | `'{}'::jsonb` |
| `valid_from` | `timestamp with time zone` | YES | `none` |
| `valid_until` | `timestamp with time zone` | YES | `none` |
| `review_date` | `timestamp with time zone` | YES | `none` |
| `renewed_from_id` | `uuid` | YES | `none` |
| `sealed_at` | `timestamp with time zone` | YES | `none` |
| `seal_algorithm` | `text` | YES | `'SHA-256'::text` |
| `canonical_form_version` | `text` | YES | `'1.0'::text` |
| `classification_override` | `boolean` | YES | `false` |
| `classification_override_reason` | `text` | YES | `none` |
| `workflow_id` | `uuid` | YES | `none` |
| `workflow_version_id` | `uuid` | YES | `none` |
| `baseline_step_type` | `text` | YES | `none` |
| `resolved_step_type` | `text` | YES | `none` |
| `classification_source` | `text` | YES | `'WORKFLOW'::text` |
| `classification_reason` | `text` | YES | `none` |
| `expected_sla_hours` | `integer` | YES | `none` |
| `expected_decision_at` | `timestamp with time zone` | YES | `none` |
| `workflow_snapshot` | `jsonb` | YES | `'{}'::jsonb` |
| `parent_reference_id` | `uuid` | YES | `none` |
| `canonical_version` | `integer` | YES | `2` |

### Table: `approval_steps`

- **RLS Enabled**: Yes
- **Existing Policies**: `approver_acts_on_step` (UPDATE), `steps_visible_to_stakeholders` (SELECT)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `request_id` | `uuid` | NO | `none` |
| `approver_id` | `uuid` | NO | `none` |
| `type` | `text` | NO | `none` |
| `order_index` | `integer` | NO | `0` |
| `status` | `text` | NO | `'pending'::text` |
| `acted_at` | `timestamp with time zone` | YES | `none` |
| `comment` | `text` | YES | `none` |
| `condition_text` | `text` | YES | `none` |
| `acted_by_id` | `uuid` | YES | `none` |
| `delegation_id` | `uuid` | YES | `none` |
| `action_source` | `text` | YES | `none` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |
| `stage_index` | `integer` | NO | `0` |
| `recorded_offline` | `boolean` | NO | `false` |
| `recorded_by_id` | `uuid` | YES | `none` |
| `offline_source` | `text` | YES | `none` |
| `offline_note` | `text` | YES | `none` |
| `evidence_file_id` | `uuid` | YES | `none` |
| `ratification_due_at` | `timestamp with time zone` | YES | `none` |
| `ratification_status` | `text` | YES | `'pending'::text` |
| `ratified_at` | `timestamp with time zone` | YES | `none` |
| `entered_at` | `timestamp with time zone` | YES | `now()` |
| `stance` | `text` | YES | `none` |
| `outcome` | `text` | YES | `none` |
| `was_binding` | `boolean` | YES | `true` |
| `reservation_note` | `text` | YES | `none` |
| `idempotency_key` | `text` | YES | `none` |

### Table: `approver_authorities`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `approver_id` | `uuid` | NO | `none` |
| `category_id` | `uuid` | NO | `none` |
| `stage` | `integer` | NO | `none` |
| `min_value` | `numeric` | YES | `none` |
| `max_value` | `numeric` | YES | `none` |
| `is_required` | `boolean` | NO | `true` |

### Table: `approvers`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `email` | `text` | NO | `none` |
| `added_by` | `uuid` | NO | `none` |
| `added_at` | `timestamp with time zone` | NO | `now()` |
| `removed_at` | `timestamp with time zone` | YES | `none` |
| `removed_by` | `uuid` | YES | `none` |
| `note` | `text` | YES | `none` |

### Table: `attachments`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `request_id` | `uuid` | NO | `none` |
| `tenant_id` | `uuid` | NO | `none` |
| `filename` | `text` | NO | `none` |
| `storage_path` | `text` | NO | `none` |
| `size_bytes` | `bigint` | YES | `none` |
| `mime_type` | `text` | YES | `none` |
| `uploaded_by` | `uuid` | NO | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `audit_log`

- **RLS Enabled**: Yes
- **Existing Policies**: `service_inserts_audit` (INSERT), `tenant_reads_audit` (SELECT)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | YES | `none` |
| `actor_id` | `uuid` | YES | `none` |
| `action_type` | `text` | NO | `none` |
| `metadata` | `jsonb` | NO | `'{}'::jsonb` |
| `ip` | `text` | YES | `none` |
| `user_agent` | `text` | YES | `none` |
| `dkim_verified` | `boolean` | YES | `none` |
| `message_id` | `text` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `categories`

- **RLS Enabled**: Yes
- **Existing Policies**: `admin_write_categories` (ALL), `read_categories` (SELECT)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `name` | `text` | NO | `none` |
| `default_chain` | `jsonb` | NO | `'[]'::jsonb` |
| `default_sla_hours` | `integer` | NO | `72` |
| `default_visibility` | `text` | NO | `'private'::text` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `validity_mode` | `text` | NO | `'NONE'::text` |
| `default_validity_days` | `integer` | YES | `none` |
| `max_validity_days` | `integer` | YES | `none` |
| `review_only` | `boolean` | NO | `false` |
| `step_type` | `text` | NO | `'S'::text` |
| `governing_policy_id` | `uuid` | YES | `none` |
| `exclude_from_intelligence` | `boolean` | YES | `false` |
| `who_can_raise` | `text` | YES | `'ANYONE'::text` |
| `allow_participants` | `boolean` | YES | `true` |
| `allow_external_participants` | `boolean` | YES | `false` |
| `requester_description` | `text` | YES | `none` |
| `domain` | `text` | YES | `'OTHER'::text` |

### Table: `decision_calendar_events`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `name` | `text` | NO | `none` |
| `context_type` | `text` | NO | `none` |
| `starts_at` | `timestamp with time zone` | NO | `none` |
| `ends_at` | `timestamp with time zone` | NO | `none` |
| `recurring_rule` | `text` | YES | `none` |
| `expected_step_types` | `jsonb` | YES | `'[]'::jsonb` |
| `domains` | `jsonb` | YES | `'[]'::jsonb` |
| `workflows` | `jsonb` | YES | `'[]'::jsonb` |
| `description` | `text` | YES | `none` |
| `created_by` | `uuid` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `decision_events`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | NO | `none` |
| `workflow_id` | `uuid` | YES | `none` |
| `workflow_version_id` | `uuid` | YES | `none` |
| `event_type` | `text` | NO | `none` |
| `event_at` | `timestamp with time zone` | NO | `now()` |
| `actor_id` | `uuid` | YES | `none` |
| `step_id` | `uuid` | YES | `none` |
| `baseline_step_type` | `text` | YES | `none` |
| `resolved_step_type` | `text` | YES | `none` |
| `policy_id` | `uuid` | YES | `none` |
| `parent_reference_id` | `uuid` | YES | `none` |
| `stance` | `text` | YES | `none` |
| `outcome` | `text` | YES | `none` |
| `was_binding` | `boolean` | YES | `none` |
| `event_payload` | `jsonb` | NO | `'{}'::jsonb` |
| `correlation_id` | `uuid` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `decision_footprint_metrics`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | NO | `none` |
| `direct_descendant_count` | `integer` | NO | `0` |
| `transitive_descendant_count` | `integer` | NO | `0` |
| `based_on_count` | `integer` | NO | `0` |
| `exception_child_count` | `integer` | NO | `0` |
| `replacement_count` | `integer` | NO | `0` |
| `renewal_count` | `integer` | NO | `0` |
| `cross_domain_reach` | `integer` | NO | `0` |
| `persistence_days` | `integer` | NO | `0` |
| `last_activity_at` | `timestamp with time zone` | NO | `now()` |
| `refreshed_at` | `timestamp with time zone` | NO | `now()` |

### Table: `decision_period_metrics`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `period_key` | `text` | NO | `none` |
| `comparator_period_key` | `text` | NO | `none` |
| `context_id` | `uuid` | YES | `none` |
| `domain` | `text` | YES | `none` |
| `workflow_id` | `uuid` | YES | `none` |
| `step_type` | `text` | NO | `none` |
| `total_decisions` | `integer` | NO | `0` |
| `approved_count` | `integer` | NO | `0` |
| `rejected_count` | `integer` | NO | `0` |
| `exception_count` | `integer` | NO | `0` |
| `avg_cycle_hours` | `double precision` | NO | `0.0` |
| `median_cycle_hours` | `double precision` | NO | `0.0` |
| `p90_cycle_hours` | `double precision` | NO | `0.0` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `refreshed_at` | `timestamp with time zone` | NO | `now()` |

### Table: `decision_references`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `source_id` | `uuid` | NO | `none` |
| `target_id` | `uuid` | YES | `none` |
| `to_policy_id` | `uuid` | YES | `none` |
| `relationship` | `text` | NO | `none` |
| `note` | `text` | YES | `none` |
| `created_by` | `uuid` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `delegations`

- **RLS Enabled**: Yes
- **Existing Policies**: `create_delegation` (INSERT), `tenant_delegations` (SELECT)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `delegator_id` | `uuid` | NO | `none` |
| `delegate_id` | `uuid` | NO | `none` |
| `scope_categories` | `ARRAY` | YES | `none` |
| `amount_threshold` | `numeric` | YES | `none` |
| `starts_at` | `timestamp with time zone` | NO | `now()` |
| `ends_at` | `timestamp with time zone` | YES | `none` |
| `status` | `text` | NO | `'active'::text` |
| `created_by` | `uuid` | NO | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `directory_persons`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `email` | `text` | NO | `none` |
| `full_name` | `text` | NO | `none` |
| `job_title` | `text` | YES | `none` |
| `grade` | `text` | YES | `none` |
| `department` | `text` | YES | `none` |
| `location` | `text` | YES | `none` |
| `manager_email` | `text` | YES | `none` |
| `status` | `text` | NO | `'ACTIVE'::text` |
| `is_service_account` | `boolean` | NO | `false` |
| `external_id` | `text` | YES | `none` |
| `synced_at` | `timestamp with time zone` | NO | `now()` |

### Table: `hrms_sync_log`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `source` | `text` | NO | `none` |
| `changes` | `jsonb` | NO | `'{}'::jsonb` |
| `applied_at` | `timestamp with time zone` | NO | `now()` |
| `applied_by` | `uuid` | YES | `none` |

### Table: `intelligence_grants`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `email` | `text` | NO | `none` |
| `scope` | `text` | NO | `'AGGREGATE_ONLY'::text` |
| `granted_by` | `uuid` | NO | `none` |
| `granted_at` | `timestamp with time zone` | NO | `now()` |
| `grant_request_id` | `uuid` | YES | `none` |
| `reason` | `text` | YES | `none` |
| `expires_at` | `timestamp with time zone` | YES | `none` |
| `revoked_at` | `timestamp with time zone` | YES | `none` |
| `revoked_by` | `uuid` | YES | `none` |
| `revoke_reason` | `text` | YES | `none` |
| `last_accessed_at` | `timestamp with time zone` | YES | `none` |
| `access_count` | `integer` | NO | `0` |

### Table: `intelligence_signals`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `signal_type` | `text` | NO | `none` |
| `entity_type` | `text` | NO | `none` |
| `entity_id` | `uuid` | YES | `none` |
| `workflow_id` | `uuid` | YES | `none` |
| `policy_id` | `uuid` | YES | `none` |
| `period_key` | `text` | NO | `none` |
| `title` | `text` | NO | `none` |
| `factual_summary` | `text` | NO | `none` |
| `pattern_summary` | `text` | YES | `none` |
| `interpretation` | `text` | YES | `none` |
| `recommendation` | `text` | YES | `none` |
| `magnitude` | `double precision` | NO | `0.0` |
| `persistence` | `integer` | NO | `1` |
| `impact` | `text` | YES | `'MEDIUM'::text` |
| `confidence` | `text` | NO | `'DEVELOPING'::text` |
| `confidence_basis` | `jsonb` | NO | `'{}'::jsonb` |
| `evidence` | `jsonb` | NO | `'{}'::jsonb` |
| `status` | `text` | NO | `'ACTIVE'::text` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

### Table: `maturity_baselines`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `step_type` | `USER-DEFINED` | NO | `none` |
| `score` | `double precision` | NO | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `org_nodes`

- **RLS Enabled**: Yes
- **Existing Policies**: `admin_write_org_tree` (ALL), `read_org_tree` (SELECT)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `user_id` | `uuid` | NO | `none` |
| `parent_id` | `uuid` | YES | `none` |
| `title` | `text` | YES | `none` |
| `sort_order` | `integer` | NO | `0` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `policies`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `title` | `text` | NO | `none` |
| `reasoning` | `text` | YES | `none` |
| `category_id` | `uuid` | YES | `none` |
| `status` | `text` | NO | `'ACTIVE'::text` |
| `effective_from` | `timestamp with time zone` | NO | `now()` |
| `effective_to` | `timestamp with time zone` | YES | `none` |
| `supersedes_id` | `uuid` | YES | `none` |
| `created_from_request_id` | `uuid` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `statement` | `text` | YES | `''::text` |
| `owning_department` | `text` | YES | `none` |
| `created_by` | `uuid` | YES | `none` |
| `bound_type` | `text` | YES | `'NONE'::text` |
| `bound_value` | `numeric` | YES | `none` |
| `bound_field` | `text` | YES | `none` |

### Table: `policy_period_metrics`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `policy_id` | `uuid` | NO | `none` |
| `period_key` | `text` | NO | `none` |
| `total_governed_decisions` | `integer` | NO | `0` |
| `based_on_count` | `integer` | NO | `0` |
| `exception_count` | `integer` | NO | `0` |
| `governance_rate` | `double precision` | NO | `1.0` |
| `distinct_approvers` | `integer` | NO | `0` |
| `dominant_exception_reason` | `text` | YES | `none` |
| `health_state` | `text` | NO | `'HEALTHY'::text` |
| `refreshed_at` | `timestamp with time zone` | NO | `now()` |

### Table: `reference_skips`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | YES | `none` |
| `category_id` | `uuid` | NO | `none` |
| `step_type` | `USER-DEFINED` | NO | `none` |
| `skipped_by` | `uuid` | NO | `none` |
| `skipped_at` | `timestamp with time zone` | YES | `now()` |
| `reason` | `text` | NO | `none` |
| `described_rule` | `text` | YES | `none` |

### Table: `request_participants`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | NO | `none` |
| `email` | `text` | NO | `none` |
| `role` | `text` | NO | `none` |
| `is_external` | `boolean` | NO | `false` |
| `added_by` | `uuid` | NO | `none` |
| `added_at` | `timestamp with time zone` | NO | `now()` |
| `reason` | `text` | YES | `none` |
| `state` | `text` | NO | `'PENDING'::text` |
| `responded_at` | `timestamp with time zone` | YES | `none` |
| `comment` | `text` | YES | `none` |

### Table: `stage_transition_metrics`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `period_key` | `text` | NO | `none` |
| `context_id` | `uuid` | YES | `none` |
| `workflow_id` | `uuid` | NO | `none` |
| `step_type` | `text` | NO | `none` |
| `from_stage` | `text` | NO | `none` |
| `to_stage` | `text` | NO | `none` |
| `terminal_state` | `text` | YES | `none` |
| `transition_count` | `integer` | NO | `0` |
| `denominator_count` | `integer` | NO | `0` |
| `observed_probability` | `double precision` | NO | `0.0` |
| `sample_size` | `integer` | NO | `0` |
| `refreshed_at` | `timestamp with time zone` | NO | `now()` |

### Table: `support_tickets`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | YES | `none` |
| `user_id` | `uuid` | YES | `none` |
| `requester_email` | `character varying` | NO | `none` |
| `subject` | `character varying` | NO | `none` |
| `description` | `text` | NO | `none` |
| `priority` | `character varying` | YES | `'MEDIUM'::character varying` |
| `status` | `character varying` | YES | `'OPEN'::character varying` |
| `resolution_notes` | `text` | YES | `none` |
| `created_at` | `timestamp with time zone` | YES | `now()` |
| `updated_at` | `timestamp with time zone` | YES | `now()` |

### Table: `tenant_custom_fields`

- **RLS Enabled**: Yes
- **Existing Policies**: `tenant_custom_fields_delete` (DELETE), `tenant_custom_fields_insert` (INSERT), `tenant_custom_fields_select` (SELECT), `tenant_custom_fields_update` (UPDATE)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `label` | `text` | NO | `none` |
| `key` | `text` | NO | `none` |
| `type` | `text` | NO | `'TEXT'::text` |
| `options` | `jsonb` | YES | `none` |
| `required` | `boolean` | NO | `false` |
| `category_id` | `uuid` | YES | `none` |
| `sort_order` | `integer` | NO | `0` |
| `active` | `boolean` | NO | `true` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

### Table: `tenants`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `name` | `text` | NO | `none` |
| `subdomain` | `text` | NO | `none` |
| `custom_domain` | `text` | YES | `none` |
| `plan` | `text` | NO | `'free'::text` |
| `region` | `text` | NO | `'ap-south-2'::text` |
| `theme_tokens` | `jsonb` | NO | `'{}'::jsonb` |
| `email_domain` | `text` | YES | `none` |
| `dkim_verified` | `boolean` | NO | `false` |
| `powered_by` | `boolean` | NO | `true` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `hrms_sync_secret` | `text` | YES | `none` |
| `logo_url` | `text` | YES | `none` |
| `tenant_settings` | `jsonb` | YES | `none` |

### Table: `transactional_outbox`

- **RLS Enabled**: Yes
- **Existing Policies**: `tenant_isolation_outbox` (ALL)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `event_type` | `text` | NO | `none` |
| `aggregate_type` | `text` | NO | `none` |
| `aggregate_id` | `uuid` | NO | `none` |
| `payload` | `jsonb` | NO | `'{}'::jsonb` |
| `status` | `text` | NO | `'PENDING'::text` |
| `retry_count` | `integer` | NO | `0` |
| `error_message` | `text` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `processed_at` | `timestamp with time zone` | YES | `none` |

### Table: `users`

- **RLS Enabled**: Yes
- **Existing Policies**: `tenant_isolation` (ALL)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `auth_user_id` | `uuid` | YES | `none` |
| `email` | `text` | NO | `none` |
| `name` | `text` | NO | `none` |
| `role` | `text` | NO | `'member'::text` |
| `status` | `text` | NO | `'active'::text` |
| `hrms_employee_id` | `text` | YES | `none` |
| `avatar_url` | `text` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `designation` | `text` | YES | `none` |
| `career_level` | `text` | YES | `none` |
| `department` | `text` | YES | `none` |
| `manager_employee_id` | `text` | YES | `none` |
| `employee_id` | `text` | YES | `none` |
| `user_settings` | `jsonb` | YES | `none` |

### Table: `view_grants`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `request_id` | `uuid` | NO | `none` |
| `grantee_id` | `uuid` | NO | `none` |
| `granted_by_id` | `uuid` | NO | `none` |
| `status` | `text` | NO | `'pending'::text` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `resolved_at` | `timestamp with time zone` | YES | `none` |

### Table: `webhook_deliveries`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `endpoint_id` | `uuid` | NO | `none` |
| `request_id` | `uuid` | NO | `none` |
| `payload_hash` | `text` | YES | `none` |
| `attempts` | `integer` | NO | `0` |
| `status` | `text` | NO | `'pending'::text` |
| `last_attempt` | `timestamp with time zone` | YES | `none` |
| `response_code` | `integer` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `webhook_endpoints`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `uuid_generate_v4()` |
| `tenant_id` | `uuid` | NO | `none` |
| `category_id` | `uuid` | YES | `none` |
| `url` | `text` | NO | `none` |
| `hmac_secret` | `text` | NO | `none` |
| `retry_limit` | `integer` | NO | `5` |
| `active` | `boolean` | NO | `true` |
| `created_at` | `timestamp with time zone` | NO | `now()` |

### Table: `workflow_versions`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `workflow_id` | `uuid` | NO | `none` |
| `version_number` | `integer` | NO | `none` |
| `name_snapshot` | `text` | NO | `none` |
| `category_id_snapshot` | `uuid` | YES | `none` |
| `base_step_type` | `text` | NO | `none` |
| `governing_policy_id_snapshot` | `uuid` | YES | `none` |
| `steps_json` | `jsonb` | NO | `'[]'::jsonb` |
| `classification_rules_json` | `jsonb` | NO | `'{}'::jsonb` |
| `default_sla_hours` | `integer` | YES | `none` |
| `custom_fields_snapshot` | `jsonb` | YES | `'[]'::jsonb` |
| `validity_snapshot` | `jsonb` | YES | `'{}'::jsonb` |
| `opportunity_model_snapshot` | `jsonb` | YES | `'{}'::jsonb` |
| `created_by` | `uuid` | YES | `none` |
| `created_at` | `timestamp with time zone` | NO | `now()` |
| `effective_from` | `timestamp with time zone` | NO | `now()` |
| `effective_to` | `timestamp with time zone` | YES | `none` |

### Table: `workflows`

- **RLS Enabled**: Yes
- **Existing Policies**: None

| Column | Data Type | Nullable | Default |
| :--- | :--- | :---: | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NO | `none` |
| `category_id` | `uuid` | YES | `none` |
| `name` | `text` | NO | `none` |
| `is_locked` | `boolean` | NO | `false` |
| `steps` | `jsonb` | NO | `'[]'::jsonb` |
| `created_at` | `timestamp with time zone` | NO | `timezone('utc'::text, now())` |
| `description` | `text` | YES | `none` |
| `is_active` | `boolean` | NO | `true` |
| `base_step_type` | `text` | NO | `'TRANSACTIONAL'::text` |
| `governing_policy_id` | `uuid` | YES | `none` |
| `default_sla_hours` | `integer` | YES | `none` |
| `classification_rules_json` | `jsonb` | NO | `'{}'::jsonb` |
| `opportunity_model_id` | `uuid` | YES | `none` |
| `current_version_number` | `integer` | NO | `1` |
| `updated_at` | `timestamp with time zone` | NO | `now()` |

