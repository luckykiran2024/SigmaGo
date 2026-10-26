import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c'; // Meridian Corp

  const { rows: reqs } = await client.query(`
    SELECT r.id, r.ref, r.subject, r.resolved_step_type, r.created_at
    FROM approval_requests r
    WHERE r.tenant_id = $1
    ORDER BY r.created_at DESC
  `, [tenantId]);

  const { rows: refs } = await client.query(`
    SELECT id, source_id, target_id, to_policy_id, relationship
    FROM decision_references
    WHERE tenant_id = $1
  `, [tenantId]);

  console.log('Total approval_requests in Meridian:', reqs.length);
  console.log('Total decision_references in Meridian:', refs.length);

  const sourceIds = new Set(refs.map(r => r.source_id).filter(Boolean));
  const targetIds = new Set(refs.map(r => r.target_id).filter(Boolean));
  const connectedIds = new Set([...sourceIds, ...targetIds]);

  const orphans = reqs.filter(r => !connectedIds.has(r.id));
  const orphanCount = orphans.length;
  const totalCount = reqs.length;
  const orphanScore = totalCount > 0 ? (orphanCount / totalCount) * 100 : 0;
  const referencedCount = totalCount - orphanCount;
  const referencedRate = totalCount > 0 ? (referencedCount / totalCount) * 100 : 0;

  console.log(`Connected decisions: ${referencedCount} / ${totalCount} (${referencedRate.toFixed(1)}%)`);
  console.log(`Orphan decisions (no reference): ${orphanCount} / ${totalCount} (${orphanScore.toFixed(1)}%)`);
  console.log(`Orphan Score: ${orphanScore.toFixed(1)}%`);

  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
