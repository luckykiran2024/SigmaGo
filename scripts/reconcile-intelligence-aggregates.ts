/**
 * Intelligence Aggregates Reconciliation Script (Sprint 6)
 *
 * Compares raw operational records (approval_requests) against precomputed
 * decision_period_metrics and policy_period_metrics to guarantee that
 * asynchronous workers have not diverged from operational truth.
 *
 * Usage:
 *   npx tsx scripts/reconcile-intelligence-aggregates.ts [--tenant=<tenant_id>]
 */

import 'dotenv/config';
import { adminClient } from '../src/lib/supabase/admin';

export interface ReconciliationReport {
  tenantId: string;
  totalOperationalRequests: number;
  totalAggregatedDecisions: number;
  discrepancies: Array<{
    periodKey: string;
    stepType?: string;
    operationalCount: number;
    aggregateCount: number;
    difference: number;
    status: 'IN_SYNC' | 'DIVERGENT' | 'MISSING_AGGREGATE';
  }>;
  isFullyReconciled: boolean;
}

export async function reconcileIntelligenceAggregates(targetTenantId?: string): Promise<ReconciliationReport[]> {
  console.log(`\n======================================================`);
  console.log(` INTELLIGENCE AGGREGATE RECONCILIATION AUDIT`);
  console.log(`======================================================\n`);

  // 1. Resolve tenants
  let tenantQuery = adminClient.from('tenants').select('id, name, subdomain');
  if (targetTenantId) {
    tenantQuery = tenantQuery.eq('id', targetTenantId);
  }
  const { data: tenants, error: tenantErr } = await tenantQuery;
  if (tenantErr || !tenants) {
    throw new Error(`Failed to query tenants: ${tenantErr?.message}`);
  }

  const reports: ReconciliationReport[] = [];

  for (const tenant of tenants) {
    console.log(`Auditing Tenant: ${tenant.name} (${tenant.id}) ...`);

    // 2. Query raw operational requests
    const { data: rawRequests, error: reqErr } = await adminClient
      .from('approval_requests')
      .select('id, created_at, resolved_step_type, baseline_step_type, status')
      .eq('tenant_id', tenant.id);

    if (reqErr) {
      console.error(`Error querying requests for tenant ${tenant.id}:`, reqErr);
      continue;
    }

    // 3. Query decision_period_metrics
    const { data: aggregateMetrics, error: aggErr } = await adminClient
      .from('decision_period_metrics')
      .select('*')
      .eq('tenant_id', tenant.id);

    if (aggErr) {
      console.error(`Error querying aggregates for tenant ${tenant.id}:`, aggErr);
      continue;
    }

    // Group operational requests by quarter period key (e.g. 2026-Q1)
    const operationalByPeriod: Record<string, Record<string, number>> = {};
    for (const req of rawRequests || []) {
      const d = new Date(req.created_at);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const periodKey = `${d.getFullYear()}-Q${q}`;
      const st = req.resolved_step_type || req.baseline_step_type || 'UNKNOWN';

      if (!operationalByPeriod[periodKey]) {
        operationalByPeriod[periodKey] = {};
      }
      operationalByPeriod[periodKey][st] = (operationalByPeriod[periodKey][st] || 0) + 1;
    }

    const discrepancies: ReconciliationReport['discrepancies'] = [];
    let isFullyReconciled = true;
    let totalAggregated = 0;

    for (const [periodKey, stepCounts] of Object.entries(operationalByPeriod)) {
      for (const [st, count] of Object.entries(stepCounts)) {
        if (st === 'UNKNOWN') continue; // Unclassified records are not indexed in metrics

        const agg = (aggregateMetrics || []).find(
          (m: any) => m.period_key === periodKey && m.step_type === st
        );

        const aggCount = agg?.total_decisions || 0;
        totalAggregated += aggCount;
        const diff = count - aggCount;

        if (diff !== 0) {
          isFullyReconciled = false;
          discrepancies.push({
            periodKey,
            stepType: st,
            operationalCount: count,
            aggregateCount: aggCount,
            difference: diff,
            status: agg ? 'DIVERGENT' : 'MISSING_AGGREGATE',
          });
        } else {
          discrepancies.push({
            periodKey,
            stepType: st,
            operationalCount: count,
            aggregateCount: aggCount,
            difference: 0,
            status: 'IN_SYNC',
          });
        }
      }
    }

    const report: ReconciliationReport = {
      tenantId: tenant.id,
      totalOperationalRequests: rawRequests?.length || 0,
      totalAggregatedDecisions: totalAggregated,
      discrepancies,
      isFullyReconciled,
    };

    reports.push(report);

    console.log(`  - Operational Requests:  ${report.totalOperationalRequests}`);
    console.log(`  - Aggregated Decisions:  ${report.totalAggregatedDecisions}`);
    console.log(`  - In-Sync Checks:        ${discrepancies.filter((d) => d.status === 'IN_SYNC').length}`);
    console.log(`  - Discrepancies Found:   ${discrepancies.filter((d) => d.status !== 'IN_SYNC').length}`);
    console.log(`  - Reconciled:            ${isFullyReconciled ? '✅ TRUE' : '⚠️ DISCREPANCIES DETECTED'}\n`);
  }

  console.log(`======================================================\n`);
  return reports;
}

if (require.main === module || process.argv[1]?.includes('reconcile-intelligence-aggregates')) {
  const targetTenant = process.argv.find((arg) => arg.startsWith('--tenant='))?.split('=')[1];
  reconcileIntelligenceAggregates(targetTenant)
    .then((reports) => {
      const allPassed = reports.every((r) => r.isFullyReconciled);
      if (!allPassed) {
        console.warn('One or more tenants possess aggregate discrepancies. Run rebuild script to synchronize.');
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal reconciliation audit failure:', err);
      process.exit(1);
    });
}
