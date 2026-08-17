require('dotenv').config();
const { Client } = require('pg');

async function applyIntelligenceSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();

  console.log("Applying Organizational Intelligence Schema updates to PostgreSQL...");

  try {
    // 1. Create policies table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        reasoning TEXT,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
        effective_to TIMESTAMPTZ,
        supersedes_id UUID REFERENCES policies(id) ON DELETE SET NULL,
        created_from_request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log("✓ policies table verified/created.");

    // 2. Add step_type and governing_policy_id to categories
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS step_type TEXT DEFAULT 'TRANSACTIONAL',
      ADD COLUMN IF NOT EXISTS governing_policy_id UUID REFERENCES policies(id) ON DELETE SET NULL;
    `);
    console.log("✓ categories columns (step_type, governing_policy_id) verified/created.");

    // Update STEP classifications for existing categories
    await client.query(`UPDATE categories SET step_type = 'STRUCTURAL' WHERE name ILIKE '%structural%';`);
    await client.query(`UPDATE categories SET step_type = 'TRANSACTIONAL' WHERE name ILIKE '%transactional%';`);
    await client.query(`UPDATE categories SET step_type = 'EXCEPTION' WHERE name ILIKE '%exception%';`);
    await client.query(`UPDATE categories SET step_type = 'PROCESS' WHERE name ILIKE '%process%';`);

    // 3. Add entered_at to approval_steps
    await client.query(`
      ALTER TABLE approval_steps 
      ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ DEFAULT now();
    `);
    console.log("✓ approval_steps column (entered_at) verified/created.");

    // 4. Create decision_references table if not exists, then add to_policy_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        source_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        target_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
        to_policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
        relationship TEXT NOT NULL,
        note TEXT,
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    
    await client.query(`
      ALTER TABLE decision_references 
      ADD COLUMN IF NOT EXISTS to_policy_id UUID REFERENCES policies(id) ON DELETE CASCADE;
    `);
    console.log("✓ decision_references table and columns (to_policy_id) verified/created.");

    console.log("\nOrganizational Intelligence database schema successfully applied!");
  } catch (err) {
    console.error("Error applying intelligence schema:", err);
  } finally {
    await client.end();
  }
}

applyIntelligenceSchema();
