import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!baseUrl) {
  console.warn('DATABASE_URL or DIRECT_URL is not set. Skipping clean migration pipeline verification.');
  process.exit(0);
}

const testDbName = 'sigmago_clean_pipeline_test';
const testUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${testDbName}$1`);

async function runCleanMigrationPipeline() {
  console.log('🚀 Starting Clean Migration Pipeline & Schema Invariant Verification...');

  // Step 1: Create clean empty database
  const rootClient = new Client({ connectionString: baseUrl });
  try {
    await rootClient.connect();
    console.log(`🧹 Dropping and recreating clean database: ${testDbName}...`);
    await rootClient.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${testDbName}' AND pid <> pg_backend_pid();
    `);
    await rootClient.query(`DROP DATABASE IF EXISTS ${testDbName} WITH (FORCE);`);
    await rootClient.query(`CREATE DATABASE ${testDbName};`);
    await rootClient.end();
  } catch (err: any) {
    console.warn(`Could not connect to root PostgreSQL server (${err.message}). Skipping live DB test.`);
    return;
  }

  // Step 2: Apply all migrations in chronological order
  const testClient = new Client({ connectionString: testUrl });
  try {
    await testClient.connect();

    const migrationsDir = path.resolve('prisma/migrations');
    const migrationFolders = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => {
        if (a === '0_init') return -1;
        if (b === '0_init') return 1;
        return a.localeCompare(b);
      });

    console.log(`📦 Found ${migrationFolders.length} migrations to apply:`, migrationFolders);

    for (const folder of migrationFolders) {
      const sqlFile = path.join(migrationsDir, folder, 'migration.sql');
      if (fs.existsSync(sqlFile)) {
        console.log(`  Applying: ${folder}/migration.sql ...`);
        const sql = fs.readFileSync(sqlFile, 'utf8');
        await testClient.query(sql);
      }
    }
    console.log('✅ All migrations applied sequentially with ZERO errors!');

    // Step 3: Validate database contract
    const tablesRes = await testClient.query(`
      SELECT count(*)::int as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    console.log(`📊 Public tables created: ${tablesRes.rows[0].count} (Expected >= 35)`);
    if (tablesRes.rows[0].count < 35) {
      throw new Error(`Insufficient tables: ${tablesRes.rows[0].count}`);
    }

    // Check key routines
    const routinesRes = await testClient.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);
    const routines = routinesRes.rows.map((r) => r.routine_name);
    for (const exp of ['sigmago_act_on_step', 'sigmago_finalize_seal']) {
      if (!routines.includes(exp)) {
        throw new Error(`Missing expected routine: ${exp}`);
      }
    }
    console.log('✅ Required stored procedures present:', ['sigmago_act_on_step', 'sigmago_finalize_seal']);

    // Step 4: Seed minimal data and test full approval & seal lifecycle
    console.log('🌱 Seeding tenant and testing approval & seal...');
    const tRes = await testClient.query(`
      INSERT INTO tenants (name, subdomain) VALUES ('Pipeline Corp', 'pipeline') RETURNING id;
    `);
    const tenantId = tRes.rows[0].id;

    const uRes = await testClient.query(`
      INSERT INTO users (tenant_id, email, name, role) VALUES ($1, 'approver@pipeline.com', 'Approver', 'member') RETURNING id;
    `, [tenantId]);
    const approverId = uRes.rows[0].id;

    const catRes = await testClient.query(`
      INSERT INTO categories (tenant_id, name) VALUES ($1, 'Infrastructure') RETURNING id;
    `, [tenantId]);
    const catId = catRes.rows[0].id;

    const rRes = await testClient.query(`
      INSERT INTO approval_requests (tenant_id, owner_id, category_id, subject, status)
      VALUES ($1, $2, $3, 'Deploy Pipeline Cluster', 'pending')
      RETURNING id;
    `, [tenantId, approverId, catId]);
    const reqId = rRes.rows[0].id;

    const sRes = await testClient.query(`
      INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, 0, 0, 'pending', 'STRUCTURAL')
      RETURNING id;
    `, [reqId, approverId]);
    const stepId = sRes.rows[0].id;

    // Act on step
    const actRes = await testClient.query(`
      SELECT sigmago_act_on_step(
        $1::uuid, $2::uuid, $3::uuid,
        'approved', 'ENDORSED', 'APPROVED',
        true, NULL, 'LGTM', NULL, 'ui', NULL, 'test-clean-pipe-1'
      ) as result;
    `, [stepId, approverId, tenantId]);
    if (!actRes.rows[0].result.success) {
      throw new Error('sigmago_act_on_step failed');
    }
    console.log('✅ sigmago_act_on_step succeeded in clean DB');

    // Finalize Genesis request
    const sealRes = await testClient.query(`
      SELECT sigmago_finalize_seal(
        $1::uuid, $2::uuid,
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        2, 'SHA-256',
        'GENESIS_0000000000000000000000000000000000000000000000000000000000000000',
        'sig-test', 'key-1'
      ) as result;
    `, [reqId, tenantId]);
    if (!sealRes.rows[0].result.success) {
      throw new Error('sigmago_finalize_seal failed');
    }
    console.log('✅ sigmago_finalize_seal Genesis seal succeeded in clean DB');

    // Step 5: Test Fork Prevention (40001 serialization conflict)
    console.log('🔒 Testing tenant ledger fork prevention (40001 serialization error)...');
    const r2Res = await testClient.query(`
      INSERT INTO approval_requests (tenant_id, owner_id, category_id, subject, status)
      VALUES ($1, $2, $3, 'Second Request', 'finalizing')
      RETURNING id;
    `, [tenantId, approverId, catId]);
    const req2Id = r2Res.rows[0].id;

    let forkPrevented = false;
    try {
      // Intentionally provide stale GENESIS hash instead of req1's checksum
      await testClient.query(`
        SELECT sigmago_finalize_seal(
          $1::uuid, $2::uuid,
          '1111111111111111111111111111111111111111111111111111111111111111',
          2, 'SHA-256',
          'GENESIS_0000000000000000000000000000000000000000000000000000000000000000'
        );
      `, [req2Id, tenantId]);
    } catch (err: any) {
      if (err.code === '40001' || err.message.includes('Tenant ledger serialization conflict')) {
        forkPrevented = true;
        console.log('✅ Fork successfully blocked with ERRCODE 40001 (serialization_failure)!');
      } else {
        throw err;
      }
    }

    if (!forkPrevented) {
      throw new Error('Fork prevention failed! RPC allowed stale ledger predecessor without error.');
    }

    // Clean up test DB
    await testClient.end();
    const cleanupClient = new Client({ connectionString: baseUrl });
    await cleanupClient.connect();
    await cleanupClient.query(`DROP DATABASE IF EXISTS ${testDbName} WITH (FORCE);`);
    await cleanupClient.end();

    console.log('🎉 Clean Migration Pipeline Gate & Ledger Fork Prevention: 100% VERIFIED!');
  } catch (err) {
    await testClient.end().catch(() => {});
    throw err;
  }
}

runCleanMigrationPipeline().catch((err) => {
  console.error('❌ Clean migration pipeline failed:', err);
  process.exit(1);
});
