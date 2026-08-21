import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.TEST_DATABASE_URL || 'postgresql://postgres.mawiqviucthalwyfvmfr:S%40%40nv%21%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/sigmago_test';

async function applyArchV2Schema() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL test database.');

  try {
    // 1. Enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "ApprovalStance" AS ENUM ('ENDORSED', 'APPROVED_WITH_RESERVATION', 'REJECTED', 'CHANGES_REQUESTED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "ActionOutcome" AS ENUM ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'CHANGES_REQUESTED', 'DELEGATED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 2. Add columns to approval_requests
    await client.query(`
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS parent_reference_id UUID;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS chain_depth INT DEFAULT 0;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS cost_of_not_deciding TEXT;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS cost_of_deciding TEXT;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS confidence_at_seal DOUBLE PRECISION;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS soundness_at_seal DOUBLE PRECISION;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS blast_at_seal INT;
    `);

    // 3. Add columns to approval_steps
    await client.query(`
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS stance "ApprovalStance";
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS outcome "ActionOutcome";
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS reservation_note TEXT;
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS reasoning_length INT DEFAULT 0;
      ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS was_binding BOOLEAN DEFAULT TRUE;
    `);

    // 4. Add columns to users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS away_status BOOLEAN DEFAULT FALSE;
    `);

    // 5. New tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_owners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ(6) DEFAULT NOW(),
        UNIQUE (tenant_id, policy_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS exception_reasons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ(6) DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS config_changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity TEXT NOT NULL,
        change_json JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ(6) DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'support',
        created_at TIMESTAMPTZ(6) DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_support_grants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        granted_by UUID NOT NULL,
        approved_by UUID,
        reason TEXT NOT NULL,
        starts_at TIMESTAMPTZ(6) DEFAULT NOW(),
        expires_at TIMESTAMPTZ(6) NOT NULL,
        revoked_at TIMESTAMPTZ(6)
      );

      CREATE TABLE IF NOT EXISTS platform_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ(6) DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS alert_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        condition TEXT NOT NULL,
        channel TEXT NOT NULL,
        created_at TIMESTAMPTZ(6) DEFAULT NOW()
      );
    `);

    console.log('Successfully applied Architecture v2 schema additions to database.');
  } catch (err) {
    console.error('Error applying Arch v2 schema:', err);
  } finally {
    await client.end();
  }
}

applyArchV2Schema();
