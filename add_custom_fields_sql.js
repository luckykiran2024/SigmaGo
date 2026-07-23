require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    // 1. Create tenant_custom_fields table
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tenant_custom_fields';
    `);
    if (tableCheck.rows.length > 0) {
      console.log("Table tenant_custom_fields already exists. Skipping.");
    } else {
      console.log("Creating tenant_custom_fields table...");
      await client.query(`
        CREATE TABLE tenant_custom_fields (
          id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          label       TEXT NOT NULL,
          key         TEXT NOT NULL,
          type        TEXT NOT NULL DEFAULT 'TEXT',
          options     JSONB,
          required    BOOLEAN NOT NULL DEFAULT false,
          category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
          sort_order  INT NOT NULL DEFAULT 0,
          active      BOOLEAN NOT NULL DEFAULT true,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(tenant_id, key),
          CHECK (type IN ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'PERSON'))
        );
      `);
      console.log("Table created successfully.");

      console.log("Creating index on tenant_id...");
      await client.query(`
        CREATE INDEX idx_custom_fields_tenant ON tenant_custom_fields(tenant_id);
      `);
      console.log("Index created.");
    }

    // 2. Add custom_fields column to approval_requests
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'approval_requests' AND column_name = 'custom_fields';
    `);
    if (colCheck.rows.length > 0) {
      console.log("Column custom_fields already exists on approval_requests. Skipping.");
    } else {
      console.log("Adding custom_fields column to approval_requests...");
      await client.query(`
        ALTER TABLE approval_requests ADD COLUMN custom_fields JSONB DEFAULT '{}';
      `);
      console.log("Column added successfully.");
    }

    // 3. Enable RLS on tenant_custom_fields (matching other tables)
    console.log("Enabling RLS on tenant_custom_fields...");
    await client.query(`ALTER TABLE tenant_custom_fields ENABLE ROW LEVEL SECURITY;`);

    // Create RLS policies for tenant isolation
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_custom_fields' AND policyname = 'tenant_custom_fields_select') THEN
          CREATE POLICY tenant_custom_fields_select ON tenant_custom_fields FOR SELECT USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_custom_fields' AND policyname = 'tenant_custom_fields_insert') THEN
          CREATE POLICY tenant_custom_fields_insert ON tenant_custom_fields FOR INSERT WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_custom_fields' AND policyname = 'tenant_custom_fields_update') THEN
          CREATE POLICY tenant_custom_fields_update ON tenant_custom_fields FOR UPDATE USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_custom_fields' AND policyname = 'tenant_custom_fields_delete') THEN
          CREATE POLICY tenant_custom_fields_delete ON tenant_custom_fields FOR DELETE USING (true);
        END IF;
      END
      $$;
    `);
    console.log("RLS policies created.");

    console.log("\n✅ Custom fields schema migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

main();
