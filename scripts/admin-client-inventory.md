# Admin Client Privileged Access Inventory

**Audit Date**: 2026-09-04T10:52:22.571Z

## Executive Summary

| Category | Count | Percentage |
| :--- | :--- | :--- |
| **Total Privileged Calls** | **325** | 100% |
| TENANT_SCOPED | 106 | 32.6% |
| PRIMARY_KEY_KEYED | 29 | 8.9% |
| PLATFORM_PRIVILEGED | 53 | 16.3% |
| UNSAFE_UNSCOPED | 61 | 18.8% |
| UNKNOWN_REVIEW_REQUIRED | 76 | 23.4% |

## Detailed Call-Site Inventory

| File:Line | Table | Operation | Classification | Justification |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/api/cron/nudge/route.ts:14` | `approval_steps` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/nudge/route.ts:32` | `users` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/nudge/route.ts:41` | `approval_requests` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/nudge/route.ts:50` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:18` | `approval_requests` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:42` | `audit_log` | `INSERT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:59` | `decision_references` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/cron/validity-nudge/route.ts:76` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/api/health/route.ts:14` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/api/webhooks/hrms/[tenant]/route.ts:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/auth/callback/route.ts:24` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/login/actions.ts:36` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/platform-admin/actions.ts:33` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:46` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:52` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:58` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:66` | `approver_authorities` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:119` | `tenants` | `UPSERT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:139` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:143` | `auth.users` | `AUTH_ADMIN` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:156` | `users` | `UPSERT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:186` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/actions.ts:218` | `unknown` | `unknown` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/platform-admin/tickets/page.tsx:8` | `support_tickets` | `SELECT` | **PLATFORM_PRIVILEGED** | Executed within platform super-admin or system webhook/cron context. |
| `src/app/[tenant]/act/[token]/actions.ts:14` | `action_tokens` | `SELECT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/act/[token]/actions.ts:33` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/act/[token]/actions.ts:48` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/act/[token]/actions.ts:59` | `action_tokens` | `UPDATE` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/act/[token]/actions.ts:75` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/act/[token]/actions.ts:83` | `users` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup user profile by primary key UUID. |
| `src/app/[tenant]/act/[token]/actions.ts:90` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/act/[token]/actions.ts:105` | `audit_log` | `INSERT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/act/[token]/page.tsx:20` | `action_tokens` | `SELECT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/act/[token]/page.tsx:59` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/admin/approvers/actions.ts:19` | `approvers` | `UPSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:12` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/approvers/page.tsx:23` | `directory_persons` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:31` | `approvers` | `SELECT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/approvers/page.tsx:65` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/approvers/page.tsx:92` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/archived/page.tsx:23` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/archived/page.tsx:39` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/admin/categories/actions.ts:35` | `categories` | `INSERT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'categories' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/admin/categories/page.tsx:12` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/categories/page.tsx:21` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/actions.ts:28` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/custom-fields/actions.ts:37` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/custom-fields/actions.ts:96` | `unknown` | `unknown` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/custom-fields/page.tsx:20` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/custom-fields/page.tsx:30` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/delegations/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/delegations/page.tsx:40` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/delegations/page.tsx:46` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/delegations/page.tsx:53` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/intelligence/page.tsx:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/intelligence/page.tsx:25` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/intelligence/page.tsx:32` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/actions.ts:17` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/org/actions.ts:50` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/org/page.tsx:14` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/org/page.tsx:34` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/page.tsx:41` | `org_nodes` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/org/page.tsx:47` | `hrms_sync_log` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/register/page.tsx:13` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/admin/settings/actions.ts:21` | `logos` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/settings/actions.ts:34` | `logos` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/admin/settings/actions.ts:39` | `tenants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/settings/actions.ts:57` | `tenants` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/settings/actions.ts:73` | `tenants` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'tenants' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/admin/settings/page.tsx:28` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/workflows/actions.ts:16` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/workflows/actions.ts:47` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/workflows/page.tsx:16` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/admin/workflows/page.tsx:38` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/admin/workflows/page.tsx:45` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/ai/actions.ts:26` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/ai/actions.ts:46` | `audit_log` | `INSERT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/approvals/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/approvals/page.tsx:53` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/approvals/page.tsx:63` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/approvals/page.tsx:154` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/decisions/page.tsx:33` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/decisions/page.tsx:50` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:25` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/delegations/actions.ts:55` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:72` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/delegations/actions.ts:102` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/delegations/actions.ts:117` | `delegations` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/delegations/actions.ts:135` | `delegations` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/delegations/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/delegations/page.tsx:37` | `delegations` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'delegations' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/intelligence/page.tsx:22` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/intelligence/page.tsx:50` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:75` | `intelligence_grants` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'intelligence_grants' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/intelligence/page.tsx:97` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:203` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:209` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/intelligence/page.tsx:331` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/layout.tsx:39` | `tenants` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup on tenants table by unique primary key ID. |
| `src/app/[tenant]/layout.tsx:48` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/layout.tsx:56` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/page.tsx:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/page.tsx:36` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/page.tsx:95` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/page.tsx:104` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/people/[employeeId]/approvals/page.tsx:40` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/people/[employeeId]/approvals/page.tsx:66` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/records/page.tsx:32` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/records/page.tsx:59` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/new/actions.ts:33` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/new/actions.ts:58` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/new/actions.ts:90` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/new/actions.ts:107` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:132` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/actions.ts:145` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/new/actions.ts:163` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/new/actions.ts:302` | `approval_requests` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/new/actions.ts:326` | `decision_references` | `INSERT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/new/page.tsx:25` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/new/page.tsx:39` | `categories` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'categories' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/new/page.tsx:52` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/new/page.tsx:68` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:23` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:37` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:117` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/amendActions.ts:135` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:151` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:164` | `approval_steps` | `INSERT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:179` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/amendActions.ts:189` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/[id]/amendActions.ts:216` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/certificate/page.tsx:37` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:17` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:29` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:41` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:56` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/discussionActions.ts:64` | `audit_log` | `INSERT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/page.tsx:42` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/app/[tenant]/requests/[id]/page.tsx:192` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/page.tsx:201` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/requests/[id]/page.tsx:210` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/page.tsx:216` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:35` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:60` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:70` | `attachments` | `INSERT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:96` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/recordOfflineAction.ts:116` | `audit_log` | `INSERT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/requests/[id]/reference-actions.ts:66` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/settings/actions.ts:26` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/settings/actions.ts:34` | `avatars` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/settings/actions.ts:45` | `users` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/settings/actions.ts:64` | `users` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/app/[tenant]/settings/actions.ts:80` | `users` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/app/[tenant]/settings/actions.ts:121` | `auth.users` | `AUTH_ADMIN` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/app/[tenant]/settings/page.tsx:22` | `users` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup user profile by primary key UUID. |
| `src/components/ui/personPickerActions.ts:20` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/components/ui/personPickerActions.ts:34` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/components/ui/personPickerActions.ts:67` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/ai/intentResolver.ts:36` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:25` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:60` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:89` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:135` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/ai/templates.ts:173` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/ai/templates.ts:211` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/ai/templates.ts:248` | `decision_references` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/ai/templates.ts:289` | `decision_references` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/ai/templates.ts:328` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/auth/guards.ts:25` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/auth/guards.ts:74` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/certificate.ts:257` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:269` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/certificate.ts:276` | `decision_references` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/certificate.ts:282` | `request_participants` | `SELECT` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/certificate.ts:309` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/certificate.ts:363` | `approval_steps` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/certificate.ts:369` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/cache.ts:6` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/cache.ts:19` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/db/customFields.ts:24` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/customFields.ts:46` | `tenant_custom_fields` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/customFields.ts:67` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/customFields.ts:109` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/customFields.ts:124` | `unknown` | `unknown` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:66` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:71` | `approvers` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/decisions.ts:85` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/decisions.ts:95` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/decisions.ts:218` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/digest.ts:4` | `rpc:get_overdue_steps` | `RPC` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/digest.ts:10` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/grants.ts:54` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:40` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:58` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:75` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/intelligence.ts:129` | `categories` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:136` | `policies` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:145` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:160` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/intelligence.ts:168` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/orgSync.ts:77` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:100` | `users` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/orgSync.ts:125` | `users` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:157` | `approval_requests` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/orgSync.ts:162` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/orgSync.ts:169` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/orgSync.ts:178` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/orgSync.ts:183` | `unknown` | `unknown` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/orgSync.ts:197` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:202` | `unknown` | `unknown` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:214` | `org_nodes` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/orgSync.ts:248` | `org_nodes` | `UPDATE` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/orgSync.ts:265` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/references.ts:60` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:71` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:83` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:97` | `decision_references` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:115` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:138` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:149` | `decision_references` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:159` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:178` | `decision_references` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/references.ts:230` | `decision_references` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/references.ts:283` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/references.ts:305` | `decision_references` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'decision_references' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/reference_skips.ts:18` | `reference_skips` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/reference_skips.ts:44` | `reference_skips` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:68` | `approval_requests` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/requests.ts:76` | `approval_steps` | `INSERT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/requests.ts:91` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:104` | `approval_requests` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:114` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/requests.ts:129` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:211` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/requests.ts:218` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:44` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/steps.ts:92` | `rpc` | `RPC` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:122` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/steps.ts:139` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:146` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:178` | `approval_steps` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:196` | `delegations` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:214` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/steps.ts:234` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:241` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:250` | `approval_requests` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:260` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:277` | `audit_log` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:320` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/steps.ts:342` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/steps.ts:351` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:392` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:405` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/steps.ts:445` | `approval_steps` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:475` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:508` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:518` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/steps.ts:525` | `unknown` | `unknown` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:558` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:565` | `approval_requests` | `UPDATE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:570` | `unknown` | `unknown` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/steps.ts:583` | `tenants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/steps.ts:591` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/users.ts:7` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:24` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:34` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:49` | `org_nodes` | `DELETE` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/users.ts:55` | `approval_requests` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:56` | `approval_requests` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:57` | `approval_requests` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_requests' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:58` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:59` | `approval_steps` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:60` | `delegations` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'delegations' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:61` | `delegations` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'delegations' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/users.ts:62` | `audit_log` | `UPDATE` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/users.ts:65` | `users` | `DELETE` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/db/users.ts:72` | `users` | `SELECT` | **PRIMARY_KEY_KEYED** | Lookup user profile by primary key UUID. |
| `src/lib/db/workflows.ts:21` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:59` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/workflows.ts:79` | `workflow_versions` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:119` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:134` | `workflow_versions` | `UPDATE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:142` | `workflow_versions` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:162` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/workflows.ts:172` | `workflows` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'workflows' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/db/workflows.ts:194` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/workflows.ts:199` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/db/workflows.ts:212` | `workflow_versions` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:227` | `workflow_versions` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:239` | `workflows` | `DELETE` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/db/workflows.ts:250` | `workflows` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/email/outbound.ts:51` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/email/outbound.ts:119` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/email/outbound.ts:132` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/email/outbound.ts:149` | `approval_steps` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'approval_steps' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/email/outbound.ts:241` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/email/outbound.ts:254` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/email/outbound.ts:270` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/email/outbound.ts:316` | `users` | `SELECT` | **UNSAFE_UNSCOPED** | Multi-tenant table 'users' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/email/outbound.ts:329` | `tenants` | `SELECT` | **PLATFORM_PRIVILEGED** | Tenant resolution from subdomain slug for workspace routing. |
| `src/lib/email/outbound.ts:345` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/events/outbox.ts:33` | `transactional_outbox` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/events/outbox.ts:68` | `transactional_outbox` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/events/outbox.ts:101` | `transactional_outbox` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'transactional_outbox' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/events/outbox.ts:131` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/events/outbox.ts:171` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/intelligence/access.ts:35` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:52` | `intelligence_grants` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:74` | `intelligence_grants` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'intelligence_grants' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/intelligence/access.ts:117` | `intelligence_grants` | `UPSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/access.ts:155` | `intelligence_grants` | `UPDATE` | **UNSAFE_UNSCOPED** | Multi-tenant table 'intelligence_grants' queried without explicit tenant_id filter or verified primary key. |
| `src/lib/intelligence/events/emit.ts:10` | `decision_events` | `INSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:36` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:54` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/intelligence/exceptionContext.ts:78` | `policies` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/intelligence/exceptionContext.ts:99` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/intelligence/exceptionContext.ts:132` | `decision_references` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:31` | `approval_requests` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:42` | `categories` | `SELECT` | **PRIMARY_KEY_KEYED** | Keyed by primary key ID (requires verifying tenant ownership boundary in caller). |
| `src/lib/participants.ts:53` | `directory_persons` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:83` | `request_participants` | `UPSERT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/participants.ts:116` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/permissions.ts:66` | `users` | `SELECT` | **TENANT_SCOPED** | Query enforces explicit tenant_id filter constraint in chained call. |
| `src/lib/supabase/admin.ts:18` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
| `src/lib/supabase/tenantClient.ts:67` | `unknown` | `unknown` | **UNKNOWN_REVIEW_REQUIRED** | Call site requires manual architectural verification. |
