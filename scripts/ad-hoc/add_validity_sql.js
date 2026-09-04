require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    console.log("Adding validity fields to categories table...");
    
    // 1. Add validity fields to categories
    await client.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS validity_mode TEXT NOT NULL DEFAULT 'NONE',
        ADD COLUMN IF NOT EXISTS default_validity_days INT,
        ADD COLUMN IF NOT EXISTS max_validity_days INT,
        ADD COLUMN IF NOT EXISTS review_only BOOLEAN NOT NULL DEFAULT false;
    `);

    // Add constraint on validity_mode if not present
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'categories_validity_mode_check'
        ) THEN
          ALTER TABLE categories ADD CONSTRAINT categories_validity_mode_check 
            CHECK (validity_mode IN ('NONE', 'OPTIONAL', 'REQUIRED'));
        END IF;
      END
      $$;
    `);
    console.log("Categories validity fields added successfully.");

    // 2. Add validity fields to approval_requests
    console.log("Adding validity fields to approval_requests table...");
    await client.query(`
      ALTER TABLE approval_requests
        ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS renewed_from_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL;
    `);

    // Index valid_until
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_requests_valid_until ON approval_requests(valid_until);
    `);
    console.log("Approval_requests validity fields added successfully.");

    console.log("\n✅ Prompt 3 Schema Migration Complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

main();
