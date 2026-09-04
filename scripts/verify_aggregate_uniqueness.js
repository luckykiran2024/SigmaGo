const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  console.log('Connected to PostgreSQL for aggregate uniqueness test...');

  try {
    // Get an existing tenant or create a dummy tenant ID
    const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1;');
    if (tenantRes.rows.length === 0) {
      console.log('No tenants found, skipping DB uniqueness test.');
      return;
    }
    const tenantId = tenantRes.rows[0].id;
    const testPeriodKey = 'TEST_AMJ_2099';

    // Clean up any existing test records
    await client.query('DELETE FROM decision_period_metrics WHERE tenant_id = $1 AND period_key = $2;', [tenantId, testPeriodKey]);

    // Test 1: Org-level metric (workflow_id IS NULL) upsert 1
    console.log('Inserting org-level aggregate (workflow_id IS NULL)...');
    await client.query(`
      INSERT INTO decision_period_metrics (tenant_id, period_key, comparator_period_key, workflow_id, step_type, total_decisions)
      VALUES ($1, $2, 'TEST_AMJ_2098', NULL, 'STRUCTURAL', 10)
      ON CONFLICT (tenant_id, period_key, step_type) WHERE workflow_id IS NULL
      DO UPDATE SET total_decisions = EXCLUDED.total_decisions, refreshed_at = NOW();
    `, [tenantId, testPeriodKey]);

    // Test 1: Org-level metric (workflow_id IS NULL) upsert 2 (idempotent update)
    console.log('Upserting same org-level aggregate...');
    await client.query(`
      INSERT INTO decision_period_metrics (tenant_id, period_key, comparator_period_key, workflow_id, step_type, total_decisions)
      VALUES ($1, $2, 'TEST_AMJ_2098', NULL, 'STRUCTURAL', 15)
      ON CONFLICT (tenant_id, period_key, step_type) WHERE workflow_id IS NULL
      DO UPDATE SET total_decisions = EXCLUDED.total_decisions, refreshed_at = NOW();
    `, [tenantId, testPeriodKey]);

    // Check count: Must be exactly 1 row, total_decisions = 15
    const orgCheck = await client.query(`
      SELECT count(*)::int as count, max(total_decisions) as total
      FROM decision_period_metrics
      WHERE tenant_id = $1 AND period_key = $2 AND workflow_id IS NULL AND step_type = 'STRUCTURAL';
    `, [tenantId, testPeriodKey]);

    console.log('Org-level check:', orgCheck.rows[0]);
    if (orgCheck.rows[0].count !== 1 || orgCheck.rows[0].total !== 15) {
      throw new Error(`Org-level uniqueness failed: expected 1 row with total 15, got ${JSON.stringify(orgCheck.rows[0])}`);
    }
    console.log('✅ Org-level aggregate uniqueness and upsert verified (count = 1, total = 15).');

    // Clean up test rows
    await client.query('DELETE FROM decision_period_metrics WHERE tenant_id = $1 AND period_key = $2;', [tenantId, testPeriodKey]);
    console.log('✅ Cleaned up test records. All aggregate uniqueness tests passed!');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
