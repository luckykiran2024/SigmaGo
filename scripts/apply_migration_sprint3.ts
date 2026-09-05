import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const migrationPath = path.resolve(__dirname, '../prisma/migrations/20260905200001_versioned_rls_policies/migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Applying migration 20260905200001_versioned_rls_policies...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(sql);
    console.log('✅ RLS Policies applied successfully!');

    const res = await client.query(`
      SELECT tablename, count(*) as policy_count 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      GROUP BY tablename 
      ORDER BY tablename;
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
