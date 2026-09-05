const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'approval_steps'
    ORDER BY ordinal_position;
  `);
  console.log('All Columns in approval_steps:');
  console.table(res.rows);

  const types = await client.query(`
    SELECT typname, typcategory 
    FROM pg_type 
    WHERE typname IN ('ApprovalStance', 'ActionOutcome', 'approval_stance', 'action_outcome');
  `);
  console.log('Matching enum types in pg_type:');
  console.table(types.rows);

  await client.end();
}

main().catch(console.error);
