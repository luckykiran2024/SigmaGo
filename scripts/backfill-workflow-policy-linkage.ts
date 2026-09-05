/**
 * Backfill Workflow & Policy Linkage Script
 *
 * Supports deterministic dry-run mode via `--dry-run`.
 * Reconciles approval_requests lacking workflow_id, workflow_version_id, or policy linkage.
 *
 * Usage:
 *   npx tsx scripts/backfill-workflow-policy-linkage.ts --dry-run
 *   npx tsx scripts/backfill-workflow-policy-linkage.ts --execute
 */

import 'dotenv/config';
import { adminClient } from '../src/lib/supabase/admin';

interface BackfillStats {
  totalInspected: number;
  wouldUpdate: number;
  wouldSkip: number;
  ambiguous: number;
  unknown: number;
  details: Array<{
    requestId: string;
    action: 'UPDATE' | 'SKIP' | 'AMBIGUOUS' | 'UNKNOWN';
    reason: string;
    resolvedWorkflowId?: string;
    resolvedVersionId?: string;
  }>;
}

export async function runWorkflowPolicyBackfill(isDryRun: boolean): Promise<BackfillStats> {
  const stats: BackfillStats = {
    totalInspected: 0,
    wouldUpdate: 0,
    wouldSkip: 0,
    ambiguous: 0,
    unknown: 0,
    details: [],
  };

  console.log(`\n======================================================`);
  console.log(` WORKFLOW & POLICY LINKAGE BACKFILL (${isDryRun ? 'DRY RUN' : 'EXECUTE MODE'})`);
  console.log(`======================================================\n`);

  // 1. Fetch all approval_requests
  const { data: requests, error: reqError } = await adminClient
    .from('approval_requests')
    .select('id, tenant_id, category_id, workflow_id, workflow_version_id, workflow_snapshot, created_at')
    .order('created_at', { ascending: true });

  if (reqError) {
    throw new Error(`Failed to query approval_requests: ${reqError.message}`);
  }

  stats.totalInspected = requests?.length || 0;

  // 2. Fetch all active workflows and versions grouped by tenant
  const { data: workflows } = await adminClient
    .from('workflows')
    .select('id, tenant_id, category_id, name, base_step_type, governing_policy_id, default_sla_hours');

  const { data: versions } = await adminClient
    .from('workflow_versions')
    .select('*')
    .is('effective_to', null)
    .order('version_number', { ascending: false });

  for (const req of requests || []) {
    // If already has both workflow_id and workflow_version_id, skip
    if (req.workflow_id && req.workflow_version_id) {
      stats.wouldSkip++;
      stats.details.push({
        requestId: req.id,
        action: 'SKIP',
        reason: 'Already possesses valid workflow_id and workflow_version_id.',
      });
      continue;
    }

    // Attempt resolution by category_id within the tenant
    const matchingWorkflows = (workflows || []).filter(
      (w) => w.tenant_id === req.tenant_id && w.category_id === req.category_id
    );

    if (matchingWorkflows.length > 1) {
      stats.ambiguous++;
      stats.details.push({
        requestId: req.id,
        action: 'AMBIGUOUS',
        reason: `Multiple (${matchingWorkflows.length}) workflows found for category ${req.category_id}. Requires manual alignment.`,
      });
      continue;
    }

    let resolvedWf = matchingWorkflows[0];
    if (!resolvedWf) {
      // Fallback: Check if there is exactly one workflow in this tenant
      const tenantWorkflows = (workflows || []).filter((w) => w.tenant_id === req.tenant_id);
      if (tenantWorkflows.length === 1) {
        resolvedWf = tenantWorkflows[0];
      }
    }

    if (!resolvedWf) {
      stats.unknown++;
      stats.details.push({
        requestId: req.id,
        action: 'UNKNOWN',
        reason: `No matching workflow exists for category ${req.category_id} in tenant ${req.tenant_id}.`,
      });
      continue;
    }

    // Resolve active version
    const activeVersion = (versions || []).find(
      (v) => v.workflow_id === resolvedWf.id && v.tenant_id === req.tenant_id
    );

    if (!activeVersion) {
      stats.ambiguous++;
      stats.details.push({
        requestId: req.id,
        action: 'AMBIGUOUS',
        reason: `Workflow ${resolvedWf.id} found, but no active version exists.`,
      });
      continue;
    }

    stats.wouldUpdate++;
    stats.details.push({
      requestId: req.id,
      action: 'UPDATE',
      reason: `Resolvable to workflow ${resolvedWf.name} (${resolvedWf.id}) version ${activeVersion.version_number}.`,
      resolvedWorkflowId: resolvedWf.id,
      resolvedVersionId: activeVersion.id,
    });

    if (!isDryRun) {
      const { error: updateError } = await adminClient
        .from('approval_requests')
        .update({
          workflow_id: resolvedWf.id,
          workflow_version_id: activeVersion.id,
          workflow_snapshot: activeVersion,
          baseline_step_type: activeVersion.base_step_type || resolvedWf.base_step_type,
          expected_sla_hours: activeVersion.default_sla_hours || resolvedWf.default_sla_hours,
        })
        .eq('id', req.id)
        .eq('tenant_id', req.tenant_id);

      if (updateError) {
        console.error(`Error updating request ${req.id}:`, updateError);
      }
    }
  }

  console.log(`Total Requests Inspected:  ${stats.totalInspected}`);
  console.log(`Would update:              ${stats.wouldUpdate}`);
  console.log(`Would skip:                ${stats.wouldSkip}`);
  console.log(`Ambiguous:                 ${stats.ambiguous}`);
  console.log(`Unknown:                   ${stats.unknown}`);
  console.log(`======================================================\n`);

  return stats;
}

if (require.main === module || process.argv[1]?.includes('backfill-workflow-policy-linkage')) {
  const isDryRun = !process.argv.includes('--execute');
  runWorkflowPolicyBackfill(isDryRun)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error during backfill:', err);
      process.exit(1);
    });
}
