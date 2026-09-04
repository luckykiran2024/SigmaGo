const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  console.log('Connected to PostgreSQL database...');

  try {
    // 1. Partial unique indexes on decision_period_metrics to handle NULL workflow_id safely
    console.log('Applying partial unique indexes on decision_period_metrics...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_decision_period_metric_org 
      ON decision_period_metrics (tenant_id, period_key, step_type) 
      WHERE workflow_id IS NULL;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_decision_period_metric_wf 
      ON decision_period_metrics (tenant_id, period_key, workflow_id, step_type) 
      WHERE workflow_id IS NOT NULL;
    `);
    console.log('Partial unique indexes applied successfully.');

    // 2. Create transactional_outbox table
    console.log('Creating transactional_outbox table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactional_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id UUID NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'PENDING',
        retry_count INT NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_pending 
      ON transactional_outbox(status, created_at) 
      WHERE status = 'PENDING';

      CREATE INDEX IF NOT EXISTS idx_outbox_tenant 
      ON transactional_outbox(tenant_id, created_at DESC);
    `);
    console.log('transactional_outbox table created successfully.');

    // 3. Enable RLS on transactional_outbox
    await client.query(`
      ALTER TABLE transactional_outbox ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS tenant_isolation_outbox ON transactional_outbox;
      CREATE POLICY tenant_isolation_outbox ON transactional_outbox
        FOR ALL
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    `);
    console.log('RLS applied to transactional_outbox.');

    console.log('Sprint 5 database schema updates complete!');
  } catch (err) {
    console.error('Error applying schema updates:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
