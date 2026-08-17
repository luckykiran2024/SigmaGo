require('dotenv').config();
const { Client } = require('pg');

async function applyIntelligenceAccessSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();

  console.log("Applying Intelligence Access Schema (Prompt #09b) to PostgreSQL...");

  try {
    // 1. Create intelligence_grants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligence_grants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'AGGREGATE_ONLY',
        granted_by UUID NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        grant_request_id UUID,
        reason TEXT,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        revoked_by UUID,
        revoke_reason TEXT,
        last_accessed_at TIMESTAMPTZ,
        access_count INT NOT NULL DEFAULT 0,
        CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email)
      );
    `);
    console.log("✓ intelligence_grants table verified/created.");

    // 2. Add exclude_from_intelligence column to categories
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS exclude_from_intelligence BOOLEAN DEFAULT false;
    `);
    console.log("✓ categories column (exclude_from_intelligence) verified/created.");

    console.log("\nIntelligence Access Control database schema successfully applied!");
  } catch (err) {
    console.error("Error applying intelligence access schema:", err);
  } finally {
    await client.end();
  }
}

applyIntelligenceAccessSchema();
