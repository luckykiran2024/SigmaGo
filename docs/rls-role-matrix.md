# SigmaGo Row-Level Security (RLS) Access Control Matrix

This document defines the authoritative access control matrix for multi-tenant data isolation across SigmaGo's database tables. All SQL policies in `prisma/migrations/20260905200001_versioned_rls_policies/migration.sql` are generated strictly from this specification.

## 1. Actor Roles & Security Definitions

1. **Employee (Standard User / Requester)**: Authenticated user within a tenant. Can create requests, view own requests (as owner or beneficiary), view relevant steps, and read active workflows/policies.
2. **Approver / Delegate**: Authenticated user assigned to one or more approval steps, or acting as an active delegate for an assigned approver.
3. **Tenant Admin**: Administrator for a specific tenant workspace (`role IN ('admin', 'owner')`). Full access to configure tenant workflows, view all tenant requests, manage policies, and view audit logs.
4. **Aggregate OI (Organisational Intelligence Viewer)**: Read-only access to pre-computed aggregate analytical metrics (`AGGREGATE_ONLY` scope) with small cohort suppression ($< 5$).
5. **Full OI (Executive Intelligence Analyst)**: Read access to full organisational intelligence signals, category movements, and decision graphs within the tenant.
6. **Platform Super-Admin / Service Role (`service_role`)**: Privileged infrastructure background workers, webhooks, and migrations. Bypasses RLS or possesses omni-tenant access.

---

## 2. Table-by-Role RLS Access Matrix

| Table Name | Employee | Approver | Tenant Admin | Aggregate OI | Full OI | Platform / Service Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `approval_requests` | Own / Beneficiary | Relevant (assigned step) | Full Tenant | Aggregate counts only | Full Tenant (read) | Full access |
| `approval_steps` | Own request steps | Assigned / Delegated | Full Tenant | None | Controlled read | Full access |
| `workflows` | Read active (Tenant) | Read active (Tenant) | Full Manage (Tenant) | Read metadata | Read (Tenant) | Full access |
| `workflow_versions` | Read active (Tenant) | Read active (Tenant) | Full Manage (Tenant) | Read metadata | Read (Tenant) | Full access |
| `policies` | Read active (Tenant) | Read active (Tenant) | Full Manage (Tenant) | Read metadata | Read (Tenant) | Full access |
| `decision_references` | Own request refs | Assigned step refs | Full Tenant | Graph reach aggregate | Full Tenant (read) | Full access |
| `decision_events` | Limited (own actions) | Limited (assigned steps)| Full Tenant | Aggregate worker | Controlled read | Full access |
| `decision_period_metrics` | None | None | Full Tenant | Read aggregates ($\ge 5$) | Full Tenant (read) | Full access |
| `stage_transition_metrics` | None | None | Full Tenant | Read aggregates ($\ge 5$) | Full Tenant (read) | Full access |
| `policy_period_metrics` | None | None | Full Tenant | Read aggregates ($\ge 5$) | Full Tenant (read) | Full access |
| `decision_footprint_metrics`| None | None | Full Tenant | Read aggregates | Full Tenant (read) | Full access |
| `intelligence_signals` | None | None | Full Tenant | Read signals | Full Tenant (read) | Full access |
| `attachments` | Own request / step | Assigned request | Full Tenant | None | None | Full access |
| `request_participants` | Own request | Assigned request | Full Tenant | None | Controlled read | Full access |
| `audit_log` | None | None | Full Tenant (read-only)| None | Controlled read | Full access (append) |
| `transactional_outbox` | Insert via action | Insert via action | None (Worker only) | None | None | Full Worker claim |
| `delegations` | Own delegator/delegate| Own delegator/delegate| Full Tenant | None | None | Full access |
| `categories` | Read (Tenant) | Read (Tenant) | Full Manage (Tenant) | Read | Read | Full access |
| `users` | Own profile + Tenant | Own profile + Tenant | Full Tenant | Directory read | Directory read | Full access |

---

## 3. Child-Table Isolation Invariant

Child tables (`approval_steps`, `attachments`, `decision_references`, `request_participants`) inherit tenant boundaries strictly through their parent request:

```sql
tenant_id = (SELECT tenant_id FROM approval_requests WHERE id = table.request_id)
```

No query can ever leak rows across tenant boundaries even if step or reference IDs are known.
