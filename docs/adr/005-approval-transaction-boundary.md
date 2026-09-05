# ADR 005: Approval Transaction Boundary & Two-Phase Finalisation

## Status
Accepted

## Context
Approving a high-value enterprise request involves multiple critical steps: validating the approver's authorization, advancing the approval chain, emitting audit logs, and generating a tamper-evident seal upon final approval. If concurrent requests race or if cryptographic sealing fails mid-flight, requests could be left in an inconsistent state or marked approved without a checksum.

## Decision
1. **Pessimistic Row-Level Locking**:
   - `SELECT ... FOR UPDATE` locks the `approval_requests` row at the start of any step transition inside an atomic PostgreSQL RPC (`process_approval_step_atomic`).
   - Prevents double-approvals, conflicting step progressions, and race conditions.
2. **Strict Idempotency Keys**:
   - Each approval attempt requires an `idempotency_key` checked against `step_idempotency_records`.
   - Repeated submissions with the same key safely return the previously recorded result.
3. **Two-Phase Finalisation Architecture**:
   - **Phase 1 (Approval Transaction)**: When the final step in a chain is approved, the request transitions to `status = 'FINALIZING'`. It is NOT marked `approved` yet.
   - **Application Seal Generation**: The application layer constructs the canonical V2 representation and hashes it with SHA-256 (leveraging KMS / cryptographic signing).
   - **Phase 2 (Seal Atomic RPC)**: The application calls `complete_request_sealing_atomic(p_request_id, p_checksum, p_canonical_version)`.
   - **Final State**: The request transitions to `status = 'approved'` strictly with a non-null `checksum`.
4. **Failure Invariant**:
   - If seal generation fails, times out, or throws an error, the request remains in `FINALIZING`.
   - A request can **NEVER** reach `status = 'approved'` with `checksum IS NULL`.
   - Stale `FINALIZING` requests (> 5 minutes) trigger high-priority alerts.

## Consequences
- Guarantees complete atomicity without duplicating complex JSON canonicalisation logic into PL/pgSQL.
- Eliminates any possibility of unsealed approved decisions.
