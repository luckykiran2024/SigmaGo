const { Client } = require('pg');

async function applyPrimaryKeys() {
  const testUrl = "postgresql://postgres.mawiqviucthalwyfvmfr:S%40%40nv%21%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/sigmago_test";
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
