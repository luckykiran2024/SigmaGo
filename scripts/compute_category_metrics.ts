import { Client } from 'pg';
import dotenv from 'dotenv';
import { DecisionGraph } from '../src/lib/intelligence/chain/graph';
dotenv.config();

async function computeAllCategoryMetrics() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c';

  const { rows: allReqs } = await client.query('SELECT r.id, r.ref, r.subject, r.resolved_step_type, r.created_at, c.domain FROM approval_requests r JOIN categories c ON r.category_id = c.id WHERE r.tenant_id = $1 ORDER BY r.created_at DESC', [tenantId]);
  const { rows: allRefs } = await client.query('SELECT source_id, target_id, to_policy_id, relationship FROM decision_references WHERE tenant_id = $1', [tenantId]);
  const { rows: steps } = await client.query('SELECT s.id, s.status, s.stance FROM approval_steps s JOIN approval_requests r ON s.request_id = r.id WHERE r.tenant_id = $1', [tenantId]);

  const currentReqs = allReqs.filter(r => new Date(r.created_at).getFullYear() >= 2026);
  const compReqs = allReqs.filter(r => new Date(r.created_at).getFullYear() < 2026);

  const graph = new DecisionGraph();
  allReqs.forEach(r => graph.addNode({ id: r.id, ref: r.ref, subject: r.subject, stepType: r.resolved_step_type, reasoningLength: 0, isSealed: true, createdAt: r.created_at }));
  allRefs.forEach(ref => { if (ref.source_id && ref.target_id) graph.addEdge({ sourceId: ref.source_id, targetId: ref.target_id, relationship: ref.relationship }); });

  let maxBlast = 0;
  let topNodeRef = '';
  currentReqs.forEach(r => {
    const desc = graph.getTransitiveDescendants(r.id);
    if (desc.size > maxBlast) {
      maxBlast = desc.size;
      topNodeRef = r.ref;
    }
  });

  const connectedIds = new Set();
  allRefs.forEach(r => { if (r.source_id) connectedIds.add(r.source_id); if (r.target_id) connectedIds.add(r.target_id); });
  const orphans = currentReqs.filter(r => !connectedIds.has(r.id));
  const orphanScore = (orphans.length / currentReqs.length) * 100;
  const reuseRate = ((currentReqs.length - orphans.length) / currentReqs.length) * 100;

  const curExceptions = currentReqs.filter(r => r.resolved_step_type === 'EXCEPTION').length;
  const compExceptions = compReqs.filter(r => r.resolved_step_type === 'EXCEPTION').length;
  const curExRate = (curExceptions / currentReqs.length);
  const compExRate = (compExceptions / (compReqs.length || 1));
  const exceptionPressure = compExRate > 0 ? (curExRate / compExRate) : 1;

  const approvals = steps.filter(s => s.status === 'approved' || s.stance === 'APPROVED').length;
  const reservations = steps.filter(s => s.stance === 'APPROVED_WITH_RESERVATION').length;
  const totalStances = approvals + reservations || 1;
  const alignment = ((approvals + 0.5 * reservations) / totalStances) * 100;
  const resRate = (reservations / totalStances) * 100;

  console.log('Category 1: Reach & Graph Dynamics:');
  console.log({ maxBlast, topNodeRef, impactFactor: ((maxBlast / allReqs.length) * 100).toFixed(1) + '%', reuseRate: reuseRate.toFixed(1) + '%', orphanScore: orphanScore.toFixed(1) + '%' });

  console.log('Category 2: Policy Governance & Exception Risk:');
  console.log({ curExRate: (curExRate * 100).toFixed(1) + '%', compExRate: (compExRate * 100).toFixed(1) + '%', exceptionPressure: exceptionPressure.toFixed(2) + 'x', governanceRate: ((1 - curExRate * 0.79) * 100).toFixed(1) + '%' });

  console.log('Category 3: Consensus Alignment & Velocity:');
  console.log({ alignment: alignment.toFixed(1) + '%', resRate: resRate.toFixed(1) + '%' });

  console.log('Category 4: STEP Distribution:');
  const stepCounts: Record<string, number> = {};
  currentReqs.forEach(r => { stepCounts[r.resolved_step_type] = (stepCounts[r.resolved_step_type] || 0) + 1; });
  console.log(stepCounts);

  await client.end();
}
computeAllCategoryMetrics().catch(console.error);
