# ADR 001: Workflow is Expected Behaviour, Not Runtime State

## Status
Accepted

## Context
In early workflow systems, "workflows" are often conflated with mutable runtime execution states (e.g. tracking what step a ticket is on). In SigmaGo, approval requests require strict compliance governance, version-controlled policy linkage, and historical auditability.

## Decision
1. A **Workflow** represents the expected organizational behaviour (governing policy, default SLA, expected step chain, and classification rules).
2. Runtime execution is captured on the **Request** and its **Approval Steps**.
3. Every request captures immutable snapshots:
   - `workflow_id`: The parent workflow definition.
   - `workflow_version_id`: The immutable version snapshot active at request creation.
   - `workflow_snapshot`: Complete frozen JSON of rules, policies, and expected SLA.
4. Modifying a workflow in the admin console creates a new version with an incremented version number (`effective_from` to `effective_to = NULL`). It never mutates in-flight or historical requests.

## Consequences
- Historical decision records remain 100% reproducible and verifiable even if the parent workflow is changed, archived, or deleted years later.
- Organizational Intelligence can measure actual decision execution against the exact expected policy baseline at that moment in time.
