const { Client } = require('pg');

async function applyPrimaryKeys() {
  const testUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

  if (!testUrl) {
    throw new Error('FATAL: Database connection URL is missing. Set DATABASE_URL or DIRECT_URL in environment.');
  }
  const client = new Client({ connectionString: testUrl });
  await client.connect();

  const tables = [
    'tenants', 'users', 'categories', 'policies', 'approval_requests',
    'approval_steps', 'request_participants', 'decision_references', 'intelligence_grants'
  ];

  for (const t of tables) {
    try {
      await client.query(`ALTER TABLE "${t}" ADD PRIMARY KEY (id);`);
      console.log(`Primary key added to ${t}`);
    } catch (err) {
      console.log(`Primary key on ${t}:`, err.message);
    }
  }

  await client.end();
}

applyPrimaryKeys();
