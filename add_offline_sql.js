require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    console.log("Adding offline approval fields to approval_steps table...");
    
    await client.query(`
      ALTER TABLE approval_steps
        ADD COLUMN IF NOT EXISTS recorded_offline BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS recorded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS offline_source TEXT,
        ADD COLUMN IF NOT EXISTS offline_note TEXT,
        ADD COLUMN IF NOT EXISTS evidence_file_id UUID REFERENCES attachments(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS ratification_due_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS ratification_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS ratified_at TIMESTAMPTZ;
    `);

    // Add constraint on offline_source if not present
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'approval_steps_offline_source_check'
        ) THEN
          ALTER TABLE approval_steps ADD CONSTRAINT approval_steps_offline_source_check 
            CHECK (offline_source IS NULL OR offline_source IN ('EMAIL', 'CALL', 'MEETING', 'CHAT', 'OTHER'));
        END IF;
      END
      $$;
    `);

    console.log("\n✅ Prompt 5 Schema Migration Complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

main();
