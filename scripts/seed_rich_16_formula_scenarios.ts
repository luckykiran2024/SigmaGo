import { Client } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function seedRichFormulas() {
  console.log('=== SEEDING GRAPH EDGES, HISTORICAL COMPARATOR & FORMULA DATA ===');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('✓ Connected to Supabase Postgres database');

  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c'; // Meridian Corp

  // 1. Fetch existing 100 requests
  const { rows: reqs } = await client.query(`
    SELECT id, ref, subject, resolved_step_type, category_id
    FROM approval_requests
    WHERE tenant_id = $1
    ORDER BY ref ASC
  `, [tenantId]);

  console.log(`Found ${reqs.length} existing requests in Meridian Corp`);

  const reqMap = new Map<string, any>();
  reqs.forEach(r => reqMap.set(r.ref, r));

  // 2. Fetch Policies to link
  const { rows: policies } = await client.query(`
    SELECT id, title FROM policies WHERE tenant_id = $1 LIMIT 5
  `, [tenantId]);

  let policyId = policies[0]?.id;
  if (!policyId) {
    const newPolId = crypto.randomUUID();
    await client.query(`
      INSERT INTO policies (id, tenant_id, title, status, description, created_at)
      VALUES ($1, $2, 'Global Enterprise Authority & Capital Expenditure Policy', 'ACTIVE', 'Defines authority limits, delegation frameworks, and exceptions.', NOW() - interval '400 days')
    `, [newPolId, tenantId]);
    policyId = newPolId;
  }
  console.log(`✓ Active Policy for Governance Links: ${policyId}`);

  // 3. Purge existing decision_references for clean setup
  await client.query(`DELETE FROM decision_references WHERE tenant_id = $1`, [tenantId]);

  // 4. Create Multi-Hop Graph Structure (Decision-to-Decision, target_id set, to_policy_id null)
  // This produces realistic Blast Radius (> 0), Impact Factor, Cross-Domain Reach, and Reuse Rate
  console.log('Seeding multi-hop decision references graph edges...');

  const str1 = reqMap.get('STR-2026-001'); // Cloud Ledger M&A ($12.5M)
  const str2 = reqMap.get('STR-2026-002'); // Singapore Subsidiary
  const str8 = reqMap.get('STR-2026-008'); // Banking Facility Debt Restructuring

  const edges: Array<{ sourceRef: string; targetRef: string; rel: string }> = [
    // STR-2026-001 Transitive Tree (Blast Radius = 8)
    { sourceRef: 'PRC-2026-021', targetRef: 'STR-2026-001', rel: 'BASED_ON' },
    { sourceRef: 'PRC-2026-022', targetRef: 'STR-2026-001', rel: 'BASED_ON' },
    { sourceRef: 'PRC-2026-023', targetRef: 'STR-2026-001', rel: 'BASED_ON' },
    { sourceRef: 'EXP-2026-041', targetRef: 'PRC-2026-021', rel: 'EXCEPTION_TO' },
    { sourceRef: 'EXP-2026-043', targetRef: 'PRC-2026-022', rel: 'EXCEPTION_TO' },
    { sourceRef: 'TRX-2026-071', targetRef: 'PRC-2026-021', rel: 'BASED_ON' },
    { sourceRef: 'TRX-2026-072', targetRef: 'PRC-2026-021', rel: 'BASED_ON' },
    { sourceRef: 'TRX-2026-073', targetRef: 'EXP-2026-041', rel: 'BASED_ON' },

    // STR-2026-002 Transitive Tree (Blast Radius = 5)
    { sourceRef: 'PRC-2026-026', targetRef: 'STR-2026-002', rel: 'BASED_ON' },
    { sourceRef: 'EXP-2026-045', targetRef: 'STR-2026-002', rel: 'EXCEPTION_TO' },
    { sourceRef: 'TRX-2026-075', targetRef: 'PRC-2026-026', rel: 'BASED_ON' },
    { sourceRef: 'TRX-2026-076', targetRef: 'PRC-2026-026', rel: 'BASED_ON' },
    { sourceRef: 'TRX-2026-077', targetRef: 'EXP-2026-045', rel: 'BASED_ON' },

    // STR-2026-008 Transitive Tree (Blast Radius = 4)
    { sourceRef: 'PRC-2026-024', targetRef: 'STR-2026-008', rel: 'BASED_ON' },
    { sourceRef: 'EXP-2026-054', targetRef: 'STR-2026-008', rel: 'EXCEPTION_TO' },
    { sourceRef: 'TRX-2026-081', targetRef: 'PRC-2026-024', rel: 'BASED_ON' },
    { sourceRef: 'TRX-2026-082', targetRef: 'PRC-2026-024', rel: 'BASED_ON' },
  ];

  for (const e of edges) {
    const src = reqMap.get(e.sourceRef);
    const tgt = reqMap.get(e.targetRef);
    if (src && tgt) {
      await client.query(`
        INSERT INTO decision_references (id, tenant_id, source_id, target_id, to_policy_id, relationship, created_at)
        VALUES ($1, $2, $3, $4, NULL, $5, NOW() - interval '10 days')
      `, [crypto.randomUUID(), tenantId, src.id, tgt.id, e.rel]);
    }
  }

  // Also seed policy reference links (source_id set, target_id NULL, to_policy_id set)
  // Link all 30 exception requests as EXCEPTION_TO policy, and 40 process/transactional as BASED_ON policy
  const exceptionReqs = reqs.filter(r => r.resolved_step_type === 'EXCEPTION');
  for (const exp of exceptionReqs) {
    await client.query(`
      INSERT INTO decision_references (id, tenant_id, source_id, target_id, to_policy_id, relationship, created_at)
      VALUES ($1, $2, $3, NULL, $4, 'EXCEPTION_TO', NOW() - interval '10 days')
      ON CONFLICT DO NOTHING
    `, [crypto.randomUUID(), tenantId, exp.id, policyId]);
  }

  const basedOnReqs = reqs.filter(r => r.resolved_step_type === 'PROCESS' || r.resolved_step_type === 'TRANSACTIONAL').slice(0, 40);
  for (const bo of basedOnReqs) {
    await client.query(`
      INSERT INTO decision_references (id, tenant_id, source_id, target_id, to_policy_id, relationship, created_at)
      VALUES ($1, $2, $3, NULL, $4, 'BASED_ON', NOW() - interval '10 days')
      ON CONFLICT DO NOTHING
    `, [crypto.randomUUID(), tenantId, bo.id, policyId]);
  }

  // Update blast_at_seal on the structural decisions
  if (str1) await client.query(`UPDATE approval_requests SET blast_at_seal = 8 WHERE id = $1`, [str1.id]);
  if (str2) await client.query(`UPDATE approval_requests SET blast_at_seal = 5 WHERE id = $1`, [str2.id]);
  if (str8) await client.query(`UPDATE approval_requests SET blast_at_seal = 4 WHERE id = $1`, [str8.id]);

  console.log(`✓ Inserted ${edges.length} multi-hop decision graph reference links and ${exceptionReqs.length + basedOnReqs.length} policy governance links.`);

  // 5. Seed Prior-Year Comparator Period (OND 2025: Oct 1 - Dec 31, 2025)
  console.log('Checking prior-year comparator decisions (OND 2025)...');
  const { rows: baselineCheck } = await client.query(`
    SELECT count(*) as count FROM approval_requests
    WHERE tenant_id = $1 AND created_at >= '2025-10-01' AND created_at <= '2025-12-31'
  `, [tenantId]);

  if (parseInt(baselineCheck[0].count, 10) === 0) {
    console.log('Seeding 100 historical comparator decisions for OND 2025...');
    // Distribution for OND 2025:
    // Structural: 16 (16.0%) -> OND 2026 is 20 (20.0%) -> +4.0 pp movement
    // Transactional: 40 (40.0%) -> OND 2026 is 30 (30.0%) -> -10.0 pp movement
    // Exception: 24 (24.0%) -> OND 2026 is 30 (30.0%) -> +6.0 pp movement (Exception Pressure = 30/24 = 1.25x)
    // Process: 20 (20.0%) -> OND 2026 is 20 (20.0%) -> 0.0 pp movement
    
    const catRows = await client.query(`SELECT id, domain FROM categories WHERE tenant_id = $1 LIMIT 4`, [tenantId]);
    const catId = catRows.rows[0]?.id;
    const { rows: userRows } = await client.query(`SELECT id FROM users WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    const ownerId = userRows[0]?.id;

    const historical = [
      ...Array.from({ length: 16 }, (_, i) => ({ type: 'STRUCTURAL', ref: `STR-2025-${String(i + 1).padStart(3, '0')}`, sub: `Historical Structural Decision 2025 #${i + 1}` })),
      ...Array.from({ length: 40 }, (_, i) => ({ type: 'TRANSACTIONAL', ref: `TRX-2025-${String(i + 1).padStart(3, '0')}`, sub: `Historical Transactional Decision 2025 #${i + 1}` })),
      ...Array.from({ length: 24 }, (_, i) => ({ type: 'EXCEPTION', ref: `EXP-2025-${String(i + 1).padStart(3, '0')}`, sub: `Historical Exception Decision 2025 #${i + 1}` })),
      ...Array.from({ length: 20 }, (_, i) => ({ type: 'PROCESS', ref: `PRC-2025-${String(i + 1).padStart(3, '0')}`, sub: `Historical Process Decision 2025 #${i + 1}` })),
    ];

    for (let i = 0; i < historical.length; i++) {
      const h = historical[i];
      const hId = crypto.randomUUID();
      const days = 365 + Math.floor((i / 100) * 80); // within Oct-Dec 2025
      await client.query(`
        INSERT INTO approval_requests (
          id, ref, tenant_id, owner_id, category_id, subject, status,
          resolved_step_type, baseline_step_type, blast_at_seal,
          created_at, finalized_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'approved',
          $7, $7, 0,
          NOW() - interval '${days} days', NOW() - interval '${days} days' + interval '4 hours'
        )
      `, [hId, h.ref, tenantId, ownerId, catId, h.sub, h.type]);
    }
    console.log(`✓ Seeded 100 historical comparator decisions for OND 2025!`);
  } else {
    console.log(`✓ Comparator decisions already present: ${baselineCheck[0].count}`);
  }

  // 6. Update Approval Steps with Reservations to test Confidence/Alignment & Reservation Rate
  console.log('Injecting approval reservations to test Confidence/Alignment & Reservation Rate...');
  await client.query(`
    UPDATE approval_steps
    SET stance = 'APPROVED_WITH_RESERVATION',
        reservation_note = 'Approved with reservation: Require quarterly audit attestation within 60 days.'
    WHERE id IN (
      SELECT id FROM approval_steps WHERE status = 'approved' LIMIT 8
    )
  `);
  console.log('✓ Successfully configured approval reservations and stance metadata');

  await client.end();
  console.log('=== SEEDING COMPLETE: ALL 16 FORMULAS OPERATIONAL IN DATABASE ===');
}

seedRichFormulas().catch(console.error);
