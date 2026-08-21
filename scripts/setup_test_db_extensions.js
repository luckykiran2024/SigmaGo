const { Client } = require('pg');

async function setupExtensions() {
  const connectionString = "postgresql://postgres.mawiqviucthalwyfvmfr:S%40%40nv%21%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/sigmago_test";
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await client.query('CREATE SEQUENCE IF NOT EXISTS request_seq START 1;');
    console.log('Extensions and request_seq created on sigmago_test database.');
  } catch (err) {
    console.error('Error setup:', err.message);
  } finally {
    await client.end();
  }
}

setupExtensions();
