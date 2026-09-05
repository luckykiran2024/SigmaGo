# ADR 004: Tenant Isolation, Row-Level Security (RLS) & Privileged Access Control

## Status
Accepted

## Context
SigmaGo is a multi-tenant enterprise system handling confidential personnel, financial, and organizational intelligence data. Defense-in-depth requires that tenant isolation cannot rely solely on application-layer query filters.

## Decision
1. **Supabase PostgreSQL RLS as Baseline Defense**:
   - All tenant-bound tables have Row-Level Security (`ENABLE ROW LEVEL SECURITY`) and `FORCE ROW LEVEL SECURITY`.
   - Security policies evaluate tenant membership using session context (`auth.uid()` mapped against `tenant_memberships` or `app.current_tenant_id`).
2. **Authoritative Role-Based Matrix**:
   - Explicit permissions defined across personas: `Employee`, `Approver`, `Tenant Admin`, `Aggregate OI Reader`, `Full OI Auditor`, and `Platform Service`.
3. **Privileged Service-Role Governance**:
   - The Supabase service-role client (`adminClient`) bypasses RLS and is restricted to an authoritative allowlist:
     - Authentication webhooks / session bootstrapping
     - Cross-tenant aggregate intelligence background workers
     - System maintenance / scheduled reconciliation scripts
   - All normal tenant application paths require explicit `tenant_id` scoping in every query or use the tenant-scoped client.
   - `UNSAFE_UNSCOPED` queries are strictly driven to 0, verified by automated AST audit scripts in CI.

## Consequences
- Multi-tenant data leaks are prevented at the database engine level.
- Privileged service-role calls are fully inventoried, classified, and monitored.
