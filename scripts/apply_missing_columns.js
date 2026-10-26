const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to Postgres');
  await client.query(`
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS parent_reference_id UUID;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS chain_depth INT DEFAULT 0;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS cost_of_not_deciding TEXT;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS cost_of_deciding TEXT;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS confidence_at_seal DOUBLE PRECISION;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS soundness_at_seal DOUBLE PRECISION;
    ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS blast_at_seal INT;
  `);
  console.log('✓ Successfully added blast_at_seal and related columns to approval_requests');
  await client.end();
}
run().catch(console.error);
