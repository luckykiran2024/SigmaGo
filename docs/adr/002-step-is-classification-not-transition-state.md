# ADR 002: STEP is Decision Classification, Not Workflow Transition State

## Status
Accepted

## Context
SigmaGo uses the STEP taxonomy (Structural, Transactional, Exception, Process). A common anti-pattern is treating STEP as a workflow progression state (e.g. "moving from Structural to Transactional" or modeling organization-wide Markov chains across STEP types).

## Decision
1. **STEP is a Categorical Classification**: Each decision belongs to a single primary archetype:
   - **S (Structural)**: Architecture, organizational hierarchy, capital commitments, governing rules.
   - **T (Transactional)**: Routine, repeatable operational actions within established rules.
   - **E (Exception)**: Deliberate, authorized deviation from established policy limits or rules.
   - **P (Process)**: Procedural checkpoints, reviews, or operational runbooks.
2. Decisions do not transition between STEP types during execution; instead, a decision has a `baseline_step_type` (derived from workflow) and a server-evaluated `resolved_step_type` (which becomes `EXCEPTION` if policy or classification rules are breached).
3. Transitions occur between **Stages** within a workflow chain (Stage 1 -> Stage 2 -> Stage 3), while STEP describes the nature of the decision itself.

## Consequences
- Prevents meaningless statistical transitions across unrelated organizational decisions.
- Enables clean period-over-period percentage-point (pp) distribution tracking and contributor decomposition.
