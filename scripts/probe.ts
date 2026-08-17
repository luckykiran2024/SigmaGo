import 'dotenv/config';

import { Client } from 'pg';
import { advanceChain } from '../src/lib/db/steps';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function runAdvanceChain() {
  const client = new Client({ connectionString });
  await client.connect();

  const reqRes = await client.query(`SELECT id, tenant_id FROM approval_requests WHERE ref = 'REQ-2026-0034' LIMIT 1;`);
  const r = reqRes.rows[0];

  console.log('Running advanceChain for REQ-2026-0034...');
  await advanceChain(r.id, r.tenant_id);

  const res = await client.query(`
    SELECT s.id, s.order_index, s.stage_index, s.type, s.status, s.entered_at, s.acted_at, u.name
    FROM approval_steps s
    JOIN users u ON u.id = s.approver_id
    WHERE s.request_id = '${r.id}'
    ORDER BY s.order_index, u.name;
  `);

  console.table(res.rows);
  await client.end();
}

runAdvanceChain();
