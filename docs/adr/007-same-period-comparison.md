# ADR 007: Same-Period Comparison & Truthful Baselines

## Status
Accepted

## Context
Enterprise decision analysis often misleads executives by comparing non-comparable time periods (e.g. comparing Q1 post-holiday lull with Q4 year-end budget flush, or substituting missing prior data with synthetic mock trends or random distributions).

## Decision
1. **Strict Same-Period Alignment**:
   - Macro decision velocity and volume comparisons strictly compare equivalent calendar intervals (e.g. Q1 2026 vs Q1 2025, or full previous month vs same month previous year).
   - Seasonality and working-day differences are normalized using authentic historical counts, never artificial smoothing.
2. **Zero Synthetic / Mock Fallbacks**:
   - If historical data for a prior period does not exist (e.g. a newly onboarded tenant), the system displays `N/A - Insufficient Historical Data (Baseline establishing)`.
   - Under no circumstances does the system fabricate trend lines, simulate Gaussian distributions, or default unclassified requests to `TRANSACTIONAL`.
3. **Period-over-Period Percentage Point (pp) Math**:
   - STEP distribution movements are tracked strictly in percentage points ($\Delta pp = P_{\text{current}} - P_{\text{prior}}$).
   - Total movement must balance $\sum \Delta pp = 0.00\text{ pp}$.
   - Contributor decomposition must reconcile to total delta ($\left|\sum \text{contributors} - \Delta pp\right| \le 0.01\text{ pp}$).

## Consequences
- Reports presented to C-suite executives and board audit committees reflect authentic organizational reality.
- Eliminates misleading trend attribution and builds defensible trust in SigmaGo's analytics.
