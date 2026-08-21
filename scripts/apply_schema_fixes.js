const { Client } = require('pg');
require('dotenv').config();

async function applySchemaFixes() {
  const testUrl = "postgresql://postgres.mawiqviucthalwyfvmfr:S%40%40nv%21%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/sigmago_test";
  const client = new Client({ connectionString: testUrl });
  await client.connect();

  try {
    console.log('Applying database fixes to sigmago_test...');

    // Fix 1: Clean invalid rows if any and apply CHECK constraint on decision_references.relationship
    await client.query(`
      DELETE FROM decision_references WHERE relationship::text NOT IN ('BASED_ON','EXCEPTION_TO','REPLACES','RENEWAL_OF');
    `);
    await client.query(`
      ALTER TABLE decision_references DROP CONSTRAINT IF EXISTS chk_relationship;
    `);
    await client.query(`
      ALTER TABLE decision_references ADD CONSTRAINT chk_relationship CHECK (relationship::text IN ('BASED_ON','EXCEPTION_TO','REPLACES','RENEWAL_OF'));
    `);
    console.log('✓ CHECK constraint chk_relationship created successfully.');

    // Fix 2: Clean invalid rows if any and apply CHECK constraint on categories.step_type
    await client.query(`
      DELETE FROM categories WHERE step_type::text NOT IN ('STRUCTURAL','TRANSACTIONAL','EXCEPTION','PROCESS');
    `);
    await client.query(`
      ALTER TABLE categories DROP CONSTRAINT IF EXISTS chk_step_type;
    `);
    await client.query(`
      ALTER TABLE categories ADD CONSTRAINT chk_step_type CHECK (step_type::text IN ('STRUCTURAL','TRANSACTIONAL','EXCEPTION','PROCESS'));
    `);
    console.log('✓ CHECK constraint chk_step_type created successfully.');

    // Fix 3: Delete orphan decision_references and enforce ON DELETE RESTRICT on decision_references.created_by
    await client.query(`
      DELETE FROM decision_references WHERE created_by NOT IN (SELECT id FROM users);
    `);
    await client.query(`
      ALTER TABLE decision_references DROP CONSTRAINT IF EXISTS decision_references_created_by_fkey;
    `);
    await client.query(`
      ALTER TABLE decision_references ADD CONSTRAINT decision_references_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
    `);
    console.log('✓ Foreign key constraint decision_references_created_by_fkey updated to ON DELETE RESTRICT.');

    console.log('All database schema fixes applied cleanly!');
  } catch (err) {
    console.error('Error applying schema fixes:', err.message);
  } finally {
    await client.end();
  }
}

applySchemaFixes();
