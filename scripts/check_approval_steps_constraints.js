const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid) as def 
    FROM pg_constraint c
    WHERE conrelid = 'public.approval_steps'::regclass;
  `);
  console.table(res.rows);
  await client.end();
}

main().catch(console.error);
