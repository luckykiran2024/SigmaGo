import { Client } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function seedComprehensiveReferences() {
  console.log('================================================================');
  console.log('SEEDING COMPREHENSIVE DECISION REFERENCES & ORPHAN BENCHMARK');
  console.log('Goal: ~94% approvals referenced, ~6% orphan approvals');
  console.log('================================================================\n');

  const client = new Client({ connectionString });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c'; // Meridian Corp

  // 1. Fetch policies
  const { rows: policies } = await client.query(`
    SELECT id, title FROM policies WHERE tenant_id = $1 ORDER BY id ASC
  `, [tenantId]);
  const defaultPolicyId = policies[0]?.id;
  console.log(`Found ${policies.length} policies for Meridian. Primary: ${policies[0]?.title}`);

  // 2. Fetch requests grouped by period
  const { rows: reqs2026 } = await client.query(`
    SELECT id, ref, subject, resolved_step_type 
    FROM approval_requests 
    WHERE tenant_id = $1 AND created_at >= '2026-01-01'
    ORDER BY ref ASC
  `, [tenantId]);

  const { rows: reqs2025 } = await client.query(`
    SELECT id, ref, subject, resolved_step_type 
    FROM approval_requests 
    WHERE tenant_id = $1 AND created_at < '2026-01-01'
    ORDER BY ref ASC
  `, [tenantId]);

  console.log(`Current Period (2026): ${reqs2026.length} requests`);
  console.log(`Comparator Period (2025): ${reqs2025.length} requests`);

  // Clear existing decision_references for clean rebuild
  await client.query(`DELETE FROM decision_references WHERE tenant_id = $1`, [tenantId]);
  console.log('Cleaned existing decision_references.');

  const insertRef = async (ref: {
    sourceId: string;
    targetId: string | null;
    toPolicyId: string | null;
    relationship: 'BASED_ON' | 'EXCEPTION_TO' | 'REPLACES';
    notes: string;
  }) => {
    const id = crypto.randomUUID();
    await client.query(`
      INSERT INTO decision_references (id, tenant_id, source_id, target_id, to_policy_id, relationship, note, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [id, tenantId, ref.sourceId, ref.targetId, ref.toPolicyId, ref.relationship.toLowerCase(), ref.notes]);
  };

  // Helper function to link a cohort of requests
  async function linkCohort(cohort: any[], orphanCount: number, periodLabel: string) {
    const structurals = cohort.filter(r => r.resolved_step_type === 'STRUCTURAL');
    const processes = cohort.filter(r => r.resolved_step_type === 'PROCESS');
    const transactionals = cohort.filter(r => r.resolved_step_type === 'TRANSACTIONAL');
    const exceptions = cohort.filter(r => r.resolved_step_type === 'EXCEPTION');

    console.log(`\nProcessing ${periodLabel} (${cohort.length} total):`);
    console.log(`- Structural: ${structurals.length}`);
    console.log(`- Process: ${processes.length}`);
    console.log(`- Transactional: ${transactionals.length}`);
    console.log(`- Exception: ${exceptions.length}`);

    // Select designated orphans from Transactional requests
    // Exactly orphanCount approvals will remain completely untouched
    const designatedOrphans = transactionals.slice(transactionals.length - orphanCount);
    const orphanIds = new Set(designatedOrphans.map(o => o.id));
    console.log(`- Designated Orphans (${orphanCount}):`, designatedOrphans.map(o => o.ref));

    const connectedTransactionals = transactionals.filter(t => !orphanIds.has(t.id));

    // A. Link Structural decisions to Policies or Precedent Charters
    for (let i = 0; i < structurals.length; i++) {
      const s = structurals[i];
      if (i === 0 && policies[0]) {
        // Root structural decision tied to procurement threshold policy
        await insertRef({
          sourceId: s.id,
          targetId: null,
          toPolicyId: policies[0].id,
          relationship: 'BASED_ON',
          notes: `${s.ref} established under ${policies[0].title}`,
        });
      } else if (i === 1 && policies[1]) {
        await insertRef({
          sourceId: s.id,
          targetId: null,
          toPolicyId: policies[1].id,
          relationship: 'BASED_ON',
          notes: `${s.ref} governed by ${policies[1].title}`,
        });
      } else if (i === 2 && policies[2]) {
        await insertRef({
          sourceId: s.id,
          targetId: null,
          toPolicyId: policies[2].id,
          relationship: 'BASED_ON',
          notes: `${s.ref} aligned with ${policies[2].title}`,
        });
      } else {
        // Structural decisions reference root structural decisions (STR-001 / STR-002 / STR-003)
        const parentStructural = structurals[i % 3];
        await insertRef({
          sourceId: s.id,
          targetId: parentStructural.id,
          toPolicyId: null,
          relationship: i % 5 === 0 ? 'REPLACES' : 'BASED_ON',
          notes: `${s.ref} operationalizes governance of ${parentStructural.ref}`,
        });
      }
    }

    // B. Link Process decisions to Structural Decisions
    for (let i = 0; i < processes.length; i++) {
      const p = processes[i];
      const parentStructural = structurals[i % structurals.length];
      await insertRef({
        sourceId: p.id,
        targetId: parentStructural.id,
        toPolicyId: null,
        relationship: 'BASED_ON',
        notes: `${p.ref} standard operating procedure mandated by ${parentStructural.ref}`,
      });
    }

    // C. Link Connected Transactional decisions to Process SOPs
    for (let i = 0; i < connectedTransactionals.length; i++) {
      const t = connectedTransactionals[i];
      const parentProcess = processes[i % processes.length];
      await insertRef({
        sourceId: t.id,
        targetId: parentProcess.id,
        toPolicyId: null,
        relationship: 'BASED_ON',
        notes: `${t.ref} routine transactional execution under ${parentProcess.ref}`,
      });
    }

    // D. Link Exception decisions to Policies and Process SOPs
    for (let i = 0; i < exceptions.length; i++) {
      const e = exceptions[i];
      if (i % 2 === 0 && policies[i % policies.length]) {
        // Direct policy exception
        const pol = policies[i % policies.length];
        await insertRef({
          sourceId: e.id,
          targetId: null,
          toPolicyId: pol.id,
          relationship: 'EXCEPTION_TO',
          notes: `${e.ref} formal exception waiver against ${pol.title}`,
        });
      } else {
        // SOP exception to an existing Process decision
        const parentProcess = processes[i % processes.length];
        await insertRef({
          sourceId: e.id,
          targetId: parentProcess.id,
          toPolicyId: null,
          relationship: 'EXCEPTION_TO',
          notes: `${e.ref} deviation from standard workflow ${parentProcess.ref}`,
        });
      }
    }
  }

  // Current period 2026: 6 orphans out of 100 requests -> Orphan Score = 6.0% (94.0% referenced)
  await linkCohort(reqs2026, 6, 'Current Period (2026)');

  // Comparator period 2025: 8 orphans out of 100 requests -> Orphan Score = 8.0% (92.0% referenced)
  await linkCohort(reqs2025, 8, 'Comparator Period (2025)');

  // 3. Verification Query
  const { rows: verifyTotal } = await client.query(`
    SELECT count(*) FROM decision_references WHERE tenant_id = $1
  `, [tenantId]);

  const { rows: connected2026 } = await client.query(`
    SELECT DISTINCT r.id, r.ref
    FROM approval_requests r
    WHERE r.tenant_id = $1 AND r.created_at >= '2026-01-01'
    AND (
      EXISTS (SELECT 1 FROM decision_references dr WHERE dr.source_id = r.id)
      OR EXISTS (SELECT 1 FROM decision_references dr WHERE dr.target_id = r.id)
    )
  `, [tenantId]);

  const total2026 = reqs2026.length;
  const connectedCount2026 = connected2026.length;
  const orphanCount2026 = total2026 - connectedCount2026;
  const orphanScore2026 = ((orphanCount2026 / total2026) * 100).toFixed(1);
  const referencedRate2026 = ((connectedCount2026 / total2026) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log('SEEDING RESULTS & ORPHAN METRICS VERIFICATION:');
  console.log(`Total References Created: ${verifyTotal[0].count}`);
  console.log(`2026 Total Approvals:      ${total2026}`);
  console.log(`2026 Referenced Approvals: ${connectedCount2026} (${referencedRate2026}%)`);
  console.log(`2026 Orphan Approvals:     ${orphanCount2026} (${orphanScore2026}%)`);
  console.log(`2026 Orphan Score:         ${orphanScore2026}% [HEALTHY: <= 10%]`);
  console.log('================================================================\n');

  await client.end();
}

seedComprehensiveReferences().catch(err => {
  console.error(err);
  process.exit(1);
});
