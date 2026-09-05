import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const migrationPath = path.resolve(__dirname, '../prisma/migrations/20260905100000_sprint1_baseline/migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Applying migration 20260905100000_sprint1_baseline...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    const res = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'approval_requests'
      AND column_name IN ('canonical_version', 'seal_algorithm');
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
