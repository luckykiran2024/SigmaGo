import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const migrationPath = path.resolve(__dirname, '../prisma/migrations/20260905300001_rls_identity_and_grant_hardening/migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Applying migration 20260905300001_rls_identity_and_grant_hardening...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(sql);
    console.log('✅ RLS Identity & Grant Hardening applied successfully!');

    const res = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('current_user_profile_id', 'has_active_intelligence_grant', 'has_full_intelligence_grant');
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
