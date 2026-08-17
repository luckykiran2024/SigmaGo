import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL is not set.');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- Applying Schema Review DDL, RLS, Constraints, and Indexes ---');

  try {
    // 0. Create Enums in PostgreSQL if not present
    const enumsDDL = `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DecisionRelationship') THEN
          CREATE TYPE "DecisionRelationship" AS ENUM ('BASED_ON', 'EXCEPTION_TO', 'REPLACES', 'RENEWAL_OF');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StepType') THEN
          CREATE TYPE "StepType" AS ENUM ('STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntelligenceScope') THEN
          CREATE TYPE "IntelligenceScope" AS ENUM ('AGGREGATE_ONLY', 'FULL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParticipantRole') THEN
          CREATE TYPE "ParticipantRole" AS ENUM ('REFERENCE', 'CONSULTED', 'INFORMED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParticipantState') THEN
          CREATE TYPE "ParticipantState" AS ENUM ('PENDING', 'RESPONDED', 'DECLINED', 'EXPIRED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DirectoryStatus') THEN
          CREATE TYPE "DirectoryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPARTED');
        END IF;
      END $$;
    `;
    await client.query(enumsDDL);
    console.log('✓ PostgreSQL Enums created/verified');

    // 1. Create maturity_baselines table (§14)
    await client.query(`
      CREATE TABLE IF NOT EXISTS maturity_baselines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        step_type "StepType" NOT NULL,
        score DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
        CONSTRAINT uq_maturity_tenant_step UNIQUE (tenant_id, step_type)
      );
    `);
    console.log('✓ Table maturity_baselines created/verified');

    // 2. Add policies.statement, owning_department, created_by (§8)
    await client.query(`
      ALTER TABLE policies ADD COLUMN IF NOT EXISTS statement TEXT DEFAULT '';
      ALTER TABLE policies ADD COLUMN IF NOT EXISTS owning_department TEXT;
      ALTER TABLE policies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE RESTRICT;
    `);
    console.log('✓ Columns policies.statement, owning_department, created_by verified');

    // 3. Add approval_requests seal metadata fields (§11)
    await client.query(`
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS sealed_at TIMESTAMPTZ(6);
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS seal_algorithm TEXT DEFAULT 'SHA-256';
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS canonical_form_version TEXT DEFAULT '1.0';
    `);
    console.log('✓ Approval_requests seal metadata fields verified');

    // 4. Enable Row Level Security (RLS) on all new tables (§1)
    const tablesToEnableRLS = [
      'decision_references',
      'policies',
      'intelligence_grants',
      'directory_persons',
      'approvers',
      'approver_authorities',
      'request_participants',
      'maturity_baselines',
    ];

    for (const table of tablesToEnableRLS) {
      await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✓ RLS enabled on table: ${table}`);
    }

    // 5. Add Target Exclusivity CHECK Constraint on decision_references (§7)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_ref_target'
        ) THEN
          ALTER TABLE decision_references ADD CONSTRAINT chk_ref_target
            CHECK ((target_id IS NULL) <> (to_policy_id IS NULL));
        END IF;
      END $$;
    `);
    console.log('✓ CHECK constraint chk_ref_target applied to decision_references');

    // 6. Add Partial Unique Indexes on decision_references (§6)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ref_policy ON decision_references
        (tenant_id, source_id, to_policy_id, relationship) WHERE to_policy_id IS NOT NULL;
      
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ref_request ON decision_references
        (tenant_id, source_id, target_id, relationship) WHERE target_id IS NOT NULL;
    `);
    console.log('✓ Partial unique indexes uq_ref_policy and uq_ref_request applied to decision_references');

    // 7. Add Email Lowercase CHECK Constraints (§9)
    const emailTables = ['intelligence_grants', 'directory_persons', 'approvers', 'request_participants'];
    for (const table of emailTables) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'chk_${table}_email_lower'
          ) THEN
            ALTER TABLE "${table}" ADD CONSTRAINT "chk_${table}_email_lower"
              CHECK (email = lower(btrim(email)));
          END IF;
        END $$;
      `);
      console.log(`✓ Lowercase email constraint applied to ${table}`);
    }

    console.log('--- All Schema Review Database DDL Fixes Applied Successfully ---');
  } catch (err) {
    console.error('Error applying schema fixes:', err);
  } finally {
    await client.end();
  }
}

run();
