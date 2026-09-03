const { Client } = require('pg');

async function setupExtensions() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    throw new Error('FATAL: Database connection URL is missing. Set DATABASE_URL or DIRECT_URL in environment.');
  }
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
