# Admin Client Privileged Access Inventory

**Audit Date**: 2026-09-05T05:43:28.507Z

## Executive Summary

| Category | Count | Percentage |
| :--- | :--- | :--- |
| **Total Privileged Calls** | **318** | 100% |
| TENANT_SCOPED | 224 | 70.4% |
| PRIMARY_KEY_KEYED | 29 | 9.1% |
| PLATFORM_PRIVILEGED | 65 | 20.4% |
| UNSAFE_UNSCOPED | 0 | 0.0% |
| UNKNOWN_REVIEW_REQUIRED | 0 | 0.0% |

## Detailed Call-Site Inventory

| File:Line | Table | Operation | Classification | Justification |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/api/cron/nudge/route.ts:14` | `approval_steps` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/nudge/route.ts:32` | `users` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/nudge/route.ts:41` | `approval_requests` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/nudge/route.ts:50` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:18` | `approval_requests` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:42` | `audit_log` | `INSERT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:59` | `decision_references` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:76` | `audit_log` | `INSERT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/health/route.ts:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/api/webhooks/hrms/[tenant]/route.ts:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/auth/callback/route.ts:24` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/login/actions.ts:36` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:33` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:46` | `users` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:52` | `intelligence_grants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:58` | `support_tickets` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:66` | `approver_authorities` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:119` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:139` | `auth.users` | `AUTH_ADMIN` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:143` | `auth.users` | `AUTH_ADMIN` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:156` | `users` | `UPSERT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:186` | `support_tickets` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:218` | `support_tickets` | `UPDATE` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/platform-admin/tickets/page.tsx:8` | `support_tickets` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/[tenant]/act/[token]/actions.ts:14` | `action_tokens` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup on action_tokens table by unique cryptographic token. |
| `src/app/[tenant]/act/[token]/actions.ts:33` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/act/[token]/actions.ts:48` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/act/[token]/actions.ts:59` | `action_tokens` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/act/[token]/actions.ts:76` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/act/[token]/actions.ts:85` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/act/[token]/actions.ts:93` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/act/[token]/actions.ts:109` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/act/[token]/page.tsx:20` | `action_tokens` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup on action_tokens table by unique cryptographic token. |
| `src/app/[tenant]/act/[token]/page.tsx:59` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/actions.ts:19` | `approvers` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:12` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/approvers/page.tsx:23` | `directory_persons` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:31` | `approvers` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:65` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:92` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/archived/page.tsx:23` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/archived/page.tsx:39` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/categories/actions.ts:35` | `categories` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/categories/page.tsx:12` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/categories/page.tsx:21` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/actions.ts:28` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/actions.ts:37` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/actions.ts:96` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/page.tsx:20` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/page.tsx:30` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/delegations/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/delegations/page.tsx:40` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/delegations/page.tsx:46` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/delegations/page.tsx:53` | `delegations` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/intelligence/page.tsx:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/intelligence/page.tsx:25` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/intelligence/page.tsx:32` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/actions.ts:17` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/org/actions.ts:50` | `tenants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/page.tsx:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/org/page.tsx:34` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/page.tsx:41` | `org_nodes` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/page.tsx:47` | `hrms_sync_log` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/register/page.tsx:13` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/settings/actions.ts:21` | `storage:logos` | `STORAGE` | **PLATFORM_PRIVILEGED** | Supabase storage bucket access via service-role. |
| `src/app/[tenant]/admin/settings/actions.ts:34` | `storage:logos` | `STORAGE` | **PLATFORM_PRIVILEGED** | Supabase storage bucket access via service-role. |
| `src/app/[tenant]/admin/settings/actions.ts:39` | `tenants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/settings/actions.ts:57` | `tenants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/settings/actions.ts:73` | `tenants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/settings/page.tsx:28` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/workflows/actions.ts:16` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/workflows/actions.ts:47` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/workflows/page.tsx:16` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/workflows/page.tsx:38` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/workflows/page.tsx:45` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/ai/actions.ts:26` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/ai/actions.ts:46` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/approvals/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/approvals/page.tsx:53` | `users` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup user profile by primary key UUID. |
| `src/app/[tenant]/approvals/page.tsx:63` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/approvals/page.tsx:154` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/decisions/page.tsx:33` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/decisions/page.tsx:50` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:25` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/delegations/actions.ts:55` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:72` | `delegations` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:102` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/delegations/actions.ts:117` | `delegations` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:135` | `delegations` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/delegations/page.tsx:37` | `delegations` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:22` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/intelligence/page.tsx:50` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:75` | `intelligence_grants` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/intelligence/page.tsx:97` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:203` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:209` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:331` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/layout.tsx:39` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/layout.tsx:48` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/layout.tsx:57` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/page.tsx:36` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/page.tsx:97` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/page.tsx:106` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/people/[employeeId]/approvals/page.tsx:40` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/people/[employeeId]/approvals/page.tsx:66` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/records/page.tsx:32` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/records/page.tsx:59` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:33` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/new/actions.ts:58` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:90` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:107` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:134` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:159` | `workflow_versions` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:183` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:322` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:346` | `decision_references` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/page.tsx:25` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/new/page.tsx:39` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/page.tsx:52` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/page.tsx:68` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:23` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:37` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:118` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:137` | `approval_steps` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:154` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:168` | `approval_steps` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:184` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:195` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:223` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/certificate/page.tsx:37` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:17` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:29` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:42` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:58` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:67` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/page.tsx:42` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/page.tsx:192` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/page.tsx:201` | `approval_steps` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/page.tsx:210` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/page.tsx:216` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:35` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:60` | `storage:attachments` | `STORAGE` | **PLATFORM_PRIVILEGED** | Supabase storage bucket access via service-role. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:70` | `attachments` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:96` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:117` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/reference-actions.ts:66` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/settings/actions.ts:26` | `storage:avatars` | `STORAGE` | **PLATFORM_PRIVILEGED** | Supabase storage bucket access via service-role. |
| `src/app/[tenant]/settings/actions.ts:34` | `storage:avatars` | `STORAGE` | **PLATFORM_PRIVILEGED** | Supabase storage bucket access via service-role. |
| `src/app/[tenant]/settings/actions.ts:45` | `users` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/settings/actions.ts:64` | `users` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/settings/actions.ts:80` | `users` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/settings/actions.ts:121` | `auth.users` | `AUTH_ADMIN` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/app/[tenant]/settings/page.tsx:22` | `users` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup user profile by primary key UUID. |
| `src/components/ui/personPickerActions.ts:20` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/components/ui/personPickerActions.ts:34` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/components/ui/personPickerActions.ts:67` | `users` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup user profile by primary key UUID. |
| `src/lib/ai/intentResolver.ts:36` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:25` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:60` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:89` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:135` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:173` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:211` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:248` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:289` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:328` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/auth/guards.ts:25` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/auth/guards.ts:74` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/certificate.ts:351` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:363` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:371` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:378` | `request_participants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:407` | `rpc` | `RPC` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:417` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:480` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:487` | `request_participants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/cache.ts:6` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/cache.ts:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/db/customFields.ts:24` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/customFields.ts:46` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/customFields.ts:67` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/customFields.ts:109` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/customFields.ts:124` | `tenant_custom_fields` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:66` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:71` | `approvers` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:85` | `approver_authorities` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:95` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:218` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/digest.ts:4` | `approval_steps` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/lib/db/digest.ts:10` | `approval_steps` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context. |
| `src/lib/db/grants.ts:54` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:40` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:58` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:75` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:129` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:136` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:145` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:160` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:168` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:77` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:100` | `users` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/orgSync.ts:125` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:157` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:163` | `delegations` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:170` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:180` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:186` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:200` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:205` | `org_nodes` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:217` | `org_nodes` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:251` | `org_nodes` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/orgSync.ts:268` | `hrms_sync_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:60` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:71` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:83` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:97` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:115` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:138` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:149` | `decision_references` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:159` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:178` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:230` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:283` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:305` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/reference_skips.ts:18` | `reference_skips` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/reference_skips.ts:44` | `reference_skips` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:68` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:76` | `approval_steps` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:91` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:104` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:115` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:131` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:213` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:220` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:44` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:94` | `rpc` | `RPC` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:140` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:158` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:165` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:194` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:212` | `delegations` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:230` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:250` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:258` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:268` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:279` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:296` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:339` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:361` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:371` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:412` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:425` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:466` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:497` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:531` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:577` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:584` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:589` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:602` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:610` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/users.ts:7` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:24` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:34` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:50` | `org_nodes` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:57` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:58` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:59` | `approval_steps` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:60` | `delegations` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:61` | `delegations` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:62` | `audit_log` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:63` | `view_grants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:64` | `view_grants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:67` | `users` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/users.ts:75` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:21` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:59` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:79` | `workflow_versions` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:119` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:134` | `workflow_versions` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:142` | `workflow_versions` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:162` | `workflow_versions` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:172` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:194` | `workflow_versions` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:200` | `workflow_versions` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:213` | `workflow_versions` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:228` | `workflow_versions` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:240` | `workflows` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:251` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:51` | `action_tokens` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:119` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/email/outbound.ts:127` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:150` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:242` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/email/outbound.ts:250` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:272` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/email/outbound.ts:299` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/email/outbound.ts:378` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/email/outbound.ts:386` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:408` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:35` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:52` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:74` | `intelligence_grants` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/intelligence/access.ts:117` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:155` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/events/emit.ts:10` | `decision_events` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:36` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:54` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:78` | `policies` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/intelligence/exceptionContext.ts:99` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:132` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:31` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:42` | `categories` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/participants.ts:53` | `directory_persons` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:83` | `request_participants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:116` | `request_participants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/permissions.ts:66` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
