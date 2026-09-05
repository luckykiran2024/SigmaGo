import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function applyMigration() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const migrationPath = path.join(process.cwd(), 'prisma/migrations/20260905400001_tenant_hash_chain/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying Migration: 20260905400001_tenant_hash_chain ...');
    await client.query(sql);
    console.log('Migration successfully applied.');
  } finally {
    await client.end();
  }
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
