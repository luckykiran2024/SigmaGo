/**
 * Rebuild Intelligence Aggregates Script (Sprint 6)
 *
 * Repopulates decision_period_metrics and stage_transition_metrics
 * directly from authoritative operational approval_requests and approval_steps.
 *
 * Usage:
 *   npx tsx scripts/rebuild-intelligence-aggregates.ts --dry-run
 *   npx tsx scripts/rebuild-intelligence-aggregates.ts --execute [--tenant=<tenant_id>]
 */

import 'dotenv/config';
import { adminClient } from '../src/lib/supabase/admin';

interface RebuildStats {
  tenantId: string;
  periodsIdentified: number;
  aggregatesCalculated: number;
  wouldInsert: number;
  wouldUpdate: number;
}

export async function rebuildIntelligenceAggregates(
  isDryRun: boolean,
  targetTenantId?: string
): Promise<RebuildStats[]> {
  console.log(`\n======================================================`);
  console.log(` REBUILD INTELLIGENCE AGGREGATES (${isDryRun ? 'DRY RUN' : 'EXECUTE MODE'})`);
  console.log(`======================================================\n`);

  let tenantQuery = adminClient.from('tenants').select('id, name');
  if (targetTenantId) {
    tenantQuery = tenantQuery.eq('id', targetTenantId);
  }
  const { data: tenants, error: tenantErr } = await tenantQuery;
  if (tenantErr || !tenants) {
    throw new Error(`Failed to query tenants: ${tenantErr?.message}`);
  }

  const results: RebuildStats[] = [];

  for (const tenant of tenants) {
    console.log(`Processing Tenant: ${tenant.name} (${tenant.id}) ...`);

    const stats: RebuildStats = {
      tenantId: tenant.id,
      periodsIdentified: 0,
      aggregatesCalculated: 0,
      wouldInsert: 0,
      wouldUpdate: 0,
    };

    // 1. Fetch all requests for this tenant
    const { data: requests } = await adminClient
      .from('approval_requests')
      .select('id, tenant_id, workflow_id, created_at, finalized_at, status, resolved_step_type, baseline_step_type')
      .eq('tenant_id', tenant.id);

    // Group by periodKey + stepType
    const periodAggs: Record<string, {
      periodKey: string;
      comparatorPeriodKey: string;
      workflowId: string | null;
      stepType: string;
      totalDecisions: number;
      approvedCount: number;
      rejectedCount: number;
      exceptionCount: number;
    }> = {};

    const VALID_STEPS = new Set(['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS']);

    for (const req of requests || []) {
      const d = new Date(req.created_at);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const periodKey = `${d.getFullYear()}-Q${q}`;
      const comparatorPeriodKey = `${d.getFullYear() - 1}-Q${q}`;

      const st = req.resolved_step_type || req.baseline_step_type;
      if (!st || !VALID_STEPS.has(st)) {
        continue; // Unclassified requests are excluded from aggregate read models
      }

      const key = `${periodKey}::${req.workflow_id || 'all'}::${st}`;
      if (!periodAggs[key]) {
        periodAggs[key] = {
          periodKey,
          comparatorPeriodKey,
          workflowId: req.workflow_id || null,
          stepType: st,
          totalDecisions: 0,
          approvedCount: 0,
          rejectedCount: 0,
          exceptionCount: 0,
        };
      }

      periodAggs[key].totalDecisions++;
      if (req.status === 'approved') periodAggs[key].approvedCount++;
      if (req.status === 'rejected') periodAggs[key].rejectedCount++;
      if (st === 'EXCEPTION') periodAggs[key].exceptionCount++;
    }

    const uniquePeriods = new Set(Object.values(periodAggs).map((a) => a.periodKey));
    stats.periodsIdentified = uniquePeriods.size;
    stats.aggregatesCalculated = Object.keys(periodAggs).length;

    // 2. Fetch existing metrics to determine inserts vs updates
    const { data: existingMetrics } = await adminClient
      .from('decision_period_metrics')
      .select('id, period_key, workflow_id, step_type')
      .eq('tenant_id', tenant.id);

    const existingMap = new Map(
      (existingMetrics || []).map((m: any) => [`${m.period_key}::${m.workflow_id || 'all'}::${m.step_type}`, m.id])
    );

    for (const [key, agg] of Object.entries(periodAggs)) {
      const existingId = existingMap.get(key);
      if (existingId) {
        stats.wouldUpdate++;
      } else {
        stats.wouldInsert++;
      }

      if (!isDryRun) {
        await adminClient.from('decision_period_metrics').upsert({
          tenant_id: tenant.id,
          period_key: agg.periodKey,
          comparator_period_key: agg.comparatorPeriodKey,
          workflow_id: agg.workflowId,
          step_type: agg.stepType,
          total_decisions: agg.totalDecisions,
          approved_count: agg.approvedCount,
          rejected_count: agg.rejectedCount,
          exception_count: agg.exceptionCount,
          refreshed_at: new Date().toISOString(),
        });
      }
    }

    console.log(`  - Periods Identified:    ${stats.periodsIdentified}`);
    console.log(`  - Calculated Aggregates: ${stats.aggregatesCalculated}`);
    console.log(`  - Inserts:               ${stats.wouldInsert}`);
    console.log(`  - Updates:               ${stats.wouldUpdate}\n`);

    results.push(stats);
  }

  console.log(`======================================================\n`);
  return results;
}

if (require.main === module || process.argv[1]?.includes('rebuild-intelligence-aggregates')) {
  const isDryRun = !process.argv.includes('--execute');
  const targetTenant = process.argv.find((arg) => arg.startsWith('--tenant='))?.split('=')[1];
  rebuildIntelligenceAggregates(isDryRun, targetTenant)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal aggregate rebuild failure:', err);
      process.exit(1);
    });
}
