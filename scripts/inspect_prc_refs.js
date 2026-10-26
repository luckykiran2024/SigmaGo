const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, ref, subject, resolved_step_type 
    FROM approval_requests 
    WHERE ref = 'PRC-2026-021' AND tenant_id = 'a636403d-55b6-4b33-b755-e4fa1d0c728c'
  `);
  console.log('PRC-2026-021:', rows[0]);

  if (rows[0]) {
    const { rows: refs } = await client.query(`
      SELECT r.id, r.source_id, r.target_id, r.relationship, r.to_policy_id,
             src.ref as source_ref, tgt.ref as target_ref
      FROM decision_references r
      LEFT JOIN approval_requests src ON r.source_id = src.id
      LEFT JOIN approval_requests tgt ON r.target_id = tgt.id
      WHERE r.source_id = $1 OR r.target_id = $1
    `, [rows[0].id]);
    console.log('References associated with PRC-2026-021:', refs);
  }
  await client.end();
}
check().catch(console.error);
