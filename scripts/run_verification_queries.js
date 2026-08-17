const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- EXECUTING REQ-2026-0034 FULL STEP CHAIN QUERY ---');

  try {
    const res = await client.query(`
      SELECT s.order_index, s.status, s.entered_at, s.acted_at, u.name
      FROM approval_steps s
      JOIN users u ON u.id = s.approver_id
      WHERE s.request_id = (SELECT id FROM approval_requests WHERE ref = 'REQ-2026-0034')
      ORDER BY s.order_index, u.name;
    `);

    console.table(res.rows);

  } catch (err) {
    console.error('Error running query:', err);
  } finally {
    await client.end();
  }
}

run();
