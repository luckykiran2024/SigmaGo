# ADR 003: Decision Seal Canonicalisation & Versioning

## Status
Accepted

## Context
SigmaGo provides tamper-evident cryptographic decision certificates. A valid seal guarantees that a decision record, its workflow context, request details, and approver actions have not been altered post-approval.
Initially, the canonical payload omitted approver reasoning comments and did not store the canonical schema version directly on the sealed record, making verification dependent on inferred schema rules.

## Decision
1. **Canonical Schema Version 2**: The canonical JSON representation includes:
   - Request metadata (`requestId`, `tenantId`, `title`, `amount`, `currency`).
   - Workflow version snapshot & policy linkage.
   - All completed approval steps with timestamp, actor ID, action (`APPROVED` / `REJECTED`), and approver comments/reasoning.
2. **Deterministic Serialization**: Keys are strictly sorted alphabetically at all nesting levels, and floats/amounts are formatted deterministically prior to SHA-256 hashing.
3. **Explicit Version Columns**:
   - `canonical_version`: Explicit integer (`1` or `2`) stored directly on `approval_requests` and `decision_certificates`.
   - `seal_algorithm`: Stored as `SHA-256`.
4. **Backward Compatibility**: Verifier checks `canonical_version`. Version 1 records verify against v1 rules; Version 2 records verify against v2 rules with approver comments.

## Consequences
- Seals are immune to timestamp-based version inference bugs.
- Approver justifications are cryptographically locked into the evidence seal.
- Any unauthorized database modification invalidates the SHA-256 digest immediately.
