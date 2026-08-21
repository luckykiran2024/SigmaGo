import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.mawiqviucthalwyfvmfr:S%40%40nv%21%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function applyPrompt17Schema() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL database for Prompt #17 Schema Update.');

  try {
    // 1. Add columns to categories
    await client.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS requester_description TEXT;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'OTHER';
    `);

    // 2. Add columns to policies
    await client.query(`
      ALTER TABLE policies ADD COLUMN IF NOT EXISTS bound_type TEXT DEFAULT 'NONE';
      ALTER TABLE policies ADD COLUMN IF NOT EXISTS bound_value DECIMAL;
      ALTER TABLE policies ADD COLUMN IF NOT EXISTS bound_field TEXT;
    `);

    // 3. Add columns to approval_requests
    await client.query(`
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS classification_override BOOLEAN DEFAULT FALSE;
      ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS classification_override_reason TEXT;
    `);

    // 4. Create reference_skips table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reference_skips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        step_type "StepType" NOT NULL,
        skipped_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skipped_at TIMESTAMPTZ(6) DEFAULT NOW(),
        reason TEXT NOT NULL,
        described_rule TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_reference_skips_tenant_cat ON reference_skips(tenant_id, category_id);
    `);

    // 5. Backfill category domains and requester_descriptions so no existing category is left blank
    await client.query(`
      UPDATE categories 
      SET domain = CASE 
        WHEN LOWER(name) LIKE '%increment%' OR LOWER(name) LIKE '%salary%' OR LOWER(name) LIKE '%compensation%' OR LOWER(name) LIKE '%hire%' OR LOWER(name) LIKE '%promotion%' THEN 'PEOPLE'
        WHEN LOWER(name) LIKE '%capex%' OR LOWER(name) LIKE '%budget%' OR LOWER(name) LIKE '%spend%' OR LOWER(name) LIKE '%financial%' THEN 'FINANCE'
        WHEN LOWER(name) LIKE '%vendor%' OR LOWER(name) LIKE '%procurement%' OR LOWER(name) LIKE '%contract%' OR LOWER(name) LIKE '%discount%' THEN 'COMMERCIAL'
        WHEN LOWER(name) LIKE '%asset%' OR LOWER(name) LIKE '%software%' OR LOWER(name) LIKE '%access%' THEN 'OPERATIONS'
        ELSE 'GOVERNANCE'
      END,
      requester_description = COALESCE(requester_description, CASE
        WHEN LOWER(name) LIKE '%out-of-cycle%' THEN 'Outside the annual compensation cycle or exceeding standard cap'
        WHEN LOWER(name) LIKE '%increment%' THEN 'Within the annual compensation cycle and standard cap'
        WHEN LOWER(name) LIKE '%capex%' THEN 'Capital expenditure requests up to defined financial threshold'
        WHEN LOWER(name) LIKE '%vendor%' THEN 'Vendor price adjustment or contract exception'
        ELSE name || ' decision request'
      END)
      WHERE requester_description IS NULL OR domain IS NULL OR domain = 'OTHER';
    `);

    console.log('Successfully applied Prompt #17 DDL schema updates and backfilled category metadata.');
  } catch (err) {
    console.error('Error applying Prompt #17 schema:', err);
    throw err;
  } finally {
    await client.end();
  }
}

applyPrompt17Schema();
