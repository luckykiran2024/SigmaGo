# SigmaGo Organisational Intelligence Architecture (v3)

## 1. System Overview & Core Principles

The SigmaGo Organisational Intelligence engine provides real-time, tamper-proof visibility into decision health, governance drift, and workflow dynamics without introducing black-box heuristics or invasive AI grading.

### Strict Architectural Guardrails
The system explicitly adheres to the following operational boundaries:
1. **No Autonomous AI Decision-Making**: Intelligence surfaces facts, patterns, interpretations, and human-actionable recommendations.
2. **No Employee/Approver "Bad Decision" Scoring**: Individual personnel are never ranked or penalized by automated scores.
3. **No Public Magical OI Score**: No opaque, single aggregate number replaces granular evidence.
4. **No Secondary Heavyweight Infrastructure**: Zero dependency on external graph databases (Neo4j), Kafka, or second backends. Operates cleanly on native PostgreSQL with Supabase, Prisma, and BullMQ background workers.
5. **No Made-Up Dollar ROI**: Exposure estimates are never presented without full on-screen line-item disclosure of material assumptions.
6. **No Individual Decision Prediction**: Does not attempt to forecast whether a specific pending request will be approved or rejected.
7. **No Organization-Wide STEP Markov Chains**: STEP is a classification dimension (Structural, Transactional, Exception, Process), not a chronological state space. Transition modeling applies only to real workflow stages or longitudinal policy health.

---

## 2. Non-Backfillable Day-3 Semantic Capture

Certain decision attributes cannot be retroactively derived from raw database state and must be captured during the operational interaction:

- **`stance`** (`ENDORSED`, `APPROVED_WITH_RESERVATION`, `REJECTED`, `CHANGES_REQUESTED`): The approver's explicit perspective on the proposal.
- **`outcome`** (`APPROVED`, `APPROVED_WITH_CONDITIONS`, `REJECTED`, `CHANGES_REQUESTED`, `DELEGATED`): Server-derived authoritative disposition.
- **`was_binding`** (`boolean`): Flags whether the participant had authoritative power or advisory input.
- **`reservation_note`** (`text`): Mandatory explanatory note whenever a step is approved with reservations or conditions.
- **`parent_reference_id`** (`uuid`): Direct linkage to preceding decisions, establishing the lineage for blast radius and inherited soundness calculations.

### Cryptographic Canonical Sealing
All Day-3 captured fields (`stance`, `outcome`, `was_binding`, `reservation_note`, `parent_reference_id`, and `decision_references`) are permanently integrated into the canonical JSON payload hashed with SHA-256 upon finalization. Any post-seal tampering invalidates the certificate seal.

---

## 3. Workflow Intelligence & Versioning

To preserve historical accuracy across organizational evolution:
- **Immutable Workflow Snapshots**: When admins modify approval steps, SLAs, governing policies, or exception boundaries, a new immutable record is created in `workflow_versions` (`version_number = N + 1`) and the previous active snapshot is retired (`effective_to = now()`).
- **Snapshot Binding**: When a request is submitted, its `workflow_id`, `workflow_version_id`, `baseline_step_type`, and `expected_sla_hours` are locked onto the request record.
- **Requester Journey Simplification**: Requesters select standard business workflows (e.g. *Promotion Approval*, *Vendor Onboarding*, *Capital Asset Allocation*). The system automatically resolves classification, approval paths, and SLAs without presenting complex STEP pickers.

---

## 4. Append-Only Event Spine (`decision_events`)

All key lifecycle milestones are asynchronously emitted to the append-only `decision_events` table:
- `REQUEST_CREATED`, `WORKFLOW_RESOLVED`, `REQUEST_SUBMITTED`
- `STEP_ACTED`, `STEP_APPROVED`, `STEP_REJECTED`, `STEP_CHANGES_REQUESTED`
- `CLASSIFICATION_RESOLVED`, `CLASSIFICATION_OVERRIDDEN`, `EXCEPTION_DETECTED`
- `POLICY_REFERENCED`, `REFERENCE_ADDED`
- `REQUEST_FINALIZED`, `REQUEST_SEALED`

---

## 5. Comparable-Period Baselines & 4-Layer Signals

### Executive Baseline Rule
- **Primary Anomaly Baseline**: Default comparator is **always the same quarter in the prior year** (e.g. AMJ 2026 vs AMJ 2025).
- **Sequential Trend**: Previous-quarter movement (AMJ 2026 vs JFM 2026) is strictly exposed as an optional descriptive trend to prevent seasonal false positives.

### 4-Layer Signal Architecture
Every intelligence alert or executive insight preserves strict separation between observation and suggestion:
1. **FACT**: System-recorded evidence (e.g., *20 of 50 decisions were exceptions under Equipment Expense Policy*).
2. **PATTERN**: Statistical aggregation (e.g., *Exception rate is 25.0 pp above historical comparable baseline*).
3. **INTERPRETATION**: Operational meaning (e.g., *Operating behaviour consistently deviates from configured policy criteria*).
4. **RECOMMENDATION**: Human governance action (e.g., *Conduct a policy review of criteria with domain owners*).

---

## 6. Verification & Automated Test Coverage

The system is continuously validated by an automated acceptance test suite in `src/test/`:
- `src/test/organisational_intelligence_analytics.unit.test.ts`: Validates period comparator rules, STEP distributions, exact contributor reconciliation ($pp$ reconciliation), and 4-layer signal formatting.
- `src/test/organisational_intelligence_phase_a_b.unit.test.ts`: Validates fail-closed security pre-flight, Day-3 server-derived outcomes, reservation note enforcement, and immutable workflow versioning snapshots.
- `src/test/decision_chain_analytics.unit.test.ts`: Validates Blast Radius, Orphan Decision Rate, and Inherited Soundness scoring.
- `src/test/intelligence_decoupled_access.unit.test.ts`: Validates email-level decoupled access grants and admin delegation.
