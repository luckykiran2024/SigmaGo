import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!baseUrl) {
  throw new Error('DATABASE_URL or DIRECT_URL is required');
}

// Derive a test DB url pointing to sigmago_repro_test
const testDbName = 'sigmago_repro_test';
const testUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${testDbName}$1`);

async function runVerification() {
  console.log('🚀 Starting Database Reproducibility & Contract Verification...');

  // Step 1: Create empty database
  const rootClient = new Client({ connectionString: baseUrl });
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
  console.log(`✅ Fresh empty database ${testDbName} created.`);

  // Step 2: Apply 0_init migration
  const testClient = new Client({ connectionString: testUrl });
  await testClient.connect();

  console.log('📦 Applying prisma/migrations/0_init/migration.sql to empty database...');
  const migrationSql = fs.readFileSync(path.resolve('prisma/migrations/0_init/migration.sql'), 'utf8');
  await testClient.query(migrationSql);
  console.log('✅ 0_init applied successfully!');

  // Step 3: Assert contract (tables, enums, functions, RLS, policies)
  const tablesRes = await testClient.query(`
    SELECT count(*)::int as count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);
  console.log(`📊 Tables created: ${tablesRes.rows[0].count} (Expected >= 35)`);
  if (tablesRes.rows[0].count < 35) {
    throw new Error(`Insufficient tables created: ${tablesRes.rows[0].count}`);
  }

  const funcsRes = await testClient.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `);
  const functions = funcsRes.rows.map(r => r.routine_name);
  console.log('🔧 Routines verified:', functions);
  const expectedRoutines = [
    'current_user_profile_id',
    'current_user_tenant_id',
    'is_current_user_tenant_admin',
    'has_active_intelligence_grant',
    'has_full_intelligence_grant',
    'sigmago_act_on_step',
    'sigmago_finalize_seal'
  ];
  for (const exp of expectedRoutines) {
    if (!functions.includes(exp)) {
      throw new Error(`Missing expected routine in contract: ${exp}`);
    }
  }

  const rlsRes = await testClient.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
    ORDER BY tablename;
  `);
  console.log(`🛡️ Tables with RLS enabled (${rlsRes.rows.length}):`, rlsRes.rows.map(r => r.tablename));

  const polRes = await testClient.query(`
    SELECT count(*)::int as count 
    FROM pg_policies 
    WHERE schemaname = 'public';
  `);
  console.log(`📜 Active RLS policies count: ${polRes.rows[0].count}`);
  if (polRes.rows[0].count < 20) {
    throw new Error(`Insufficient RLS policies. Found: ${polRes.rows[0].count}`);
  }

  // Step 4: Seed minimum tenant
  console.log('🌱 Seeding minimum tenant...');
  const tenantRes = await testClient.query(`
    INSERT INTO tenants (name, subdomain) 
    VALUES ('Acme Corporation', 'acme') 
    RETURNING id;
  `);
  const tenantId = tenantRes.rows[0].id;

  const adminRes = await testClient.query(`
    INSERT INTO users (tenant_id, email, name, role)
    VALUES ($1, 'admin@acme.com', 'Acme Admin', 'admin')
    RETURNING id;
  `, [tenantId]);
  const adminId = adminRes.rows[0].id;

  const employeeRes = await testClient.query(`
    INSERT INTO users (tenant_id, email, name, role)
    VALUES ($1, 'emp@acme.com', 'Employee One', 'member')
    RETURNING id;
  `, [tenantId]);
  const employeeId = employeeRes.rows[0].id;

  const approverRes = await testClient.query(`
    INSERT INTO users (tenant_id, email, name, role)
    VALUES ($1, 'approver@acme.com', 'Approver One', 'member')
    RETURNING id;
  `, [tenantId]);
  const approverId = approverRes.rows[0].id;

  const catRes = await testClient.query(`
    INSERT INTO categories (tenant_id, name)
    VALUES ($1, 'Cloud Infrastructure')
    RETURNING id;
  `, [tenantId]);
  const catId = catRes.rows[0].id;

  const reqRes = await testClient.query(`
    INSERT INTO approval_requests (tenant_id, owner_id, category_id, subject, status)
    VALUES ($1, $2, $3, 'Provision AWS Production Cluster', 'pending')
    RETURNING id;
  `, [tenantId, employeeId, catId]);
  const reqId = reqRes.rows[0].id;

  const stepRes = await testClient.query(`
    INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
    VALUES ($1, $2, 0, 0, 'pending', 'STRUCTURAL')
    RETURNING id;
  `, [reqId, approverId]);
  const stepId = stepRes.rows[0].id;

  console.log('✅ Minimum tenant seeded successfully:', { tenantId, adminId, reqId, stepId });

  // Step 5: Execute sigmago_act_on_step against seeded data
  console.log('⚡ Testing sigmago_act_on_step RPC on real database...');
  const actRes = await testClient.query(`
    SELECT sigmago_act_on_step(
      $1::uuid,
      $2::uuid,
      $3::uuid,
      'approved',
      'ENDORSED',
      'APPROVED',
      true,
      NULL,
      'LGTM from reproduced DB',
      NULL,
      'ui',
      NULL,
      'idem-repro-001'
    ) as result;
  `, [stepId, approverId, tenantId]);

  console.log('RPC result:', actRes.rows[0].result);
  if (!actRes.rows[0].result.success) {
    throw new Error('sigmago_act_on_step execution failed in clean DB!');
  }

  // Step 6: Test sigmago_finalize_seal
  console.log('🔒 Testing sigmago_finalize_seal RPC on real database...');
  const sealRes = await testClient.query(`
    SELECT sigmago_finalize_seal(
      $1::uuid,
      $2::uuid,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      2,
      'SHA-256'
    ) as result;
  `, [reqId, tenantId]);

  console.log('Seal result:', sealRes.rows[0].result);
  if (!sealRes.rows[0].result.success) {
    throw new Error('sigmago_finalize_seal execution failed in clean DB!');
  }

  // Verify sealed row
  const verifyReq = await testClient.query(`
    SELECT status, checksum_sha256, canonical_version, seal_algorithm, sealed_at 
    FROM approval_requests 
    WHERE id = $1;
  `, [reqId]);
  console.log('Sealed row in clean database:', verifyReq.rows[0]);
  if (verifyReq.rows[0].status !== 'approved' || !verifyReq.rows[0].sealed_at) {
    throw new Error('Request was not correctly finalized and sealed!');
  }

  await testClient.end();
  console.log('🎉 Full Database Reproducibility Contract PROVEN on clean PostgreSQL database!');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
