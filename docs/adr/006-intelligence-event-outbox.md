# ADR 006: Intelligence Event Outbox & Scalable Aggregation

## Status
Accepted

## Context
Organizational Intelligence (OI) calculates macro decision metrics (velocity, friction, STEP distribution, contributor decomposition). Direct synchronous computation of OI metrics on primary OLTP write transactions degrades approval response times and couples decision workflows with analytics failures. Conversely, purely asynchronous uncommitted events risk dropped notifications and data divergence.

## Decision
1. **Transactional Outbox Pattern**:
   - Outbox events are inserted into `transactional_outbox` inside the exact same database transaction as the operational approval state change.
   - If the approval transaction rolls back, the event is rolled back. If it commits, the event is guaranteed to persist.
2. **Event Schema Versioning**:
   - Every event payload includes `event_schema_version: 1` and `eventType` to support evolving schema shapes without breaking consumers.
3. **Atomic Job Claiming**:
   - Asynchronous workers claim batches using `status = 'PENDING'` -> `UPDATE ... status = 'PROCESSING', locked_at = NOW()` with `LIMIT` and concurrency safety.
   - Crashed workers release claims after a heartbeat timeout.
4. **Idempotent Pre-Aggregated Read Models**:
   - Outbox processors compute metrics into `decision_period_metrics` and `decision_events`.
   - Aggregation functions are idempotent on `(tenant_id, period_id, step_type)`.
5. **Operational vs Aggregate Reconciliation**:
   - Scheduled reconciliation scripts compare raw operational request totals against `decision_period_metrics`. Mismatches trigger automatic aggregate rebuilds.

## Consequences
- Primary approval transactions complete with sub-100ms latency.
- Analytics workers can fail or restart without impacting operational decision execution.
- Operational and aggregate records remain 100% reconciled and verifiable.
