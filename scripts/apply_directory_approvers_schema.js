require('dotenv').config();
const { Client } = require('pg');

async function applyDirectoryApproversSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();

  console.log("Applying Directory, Approver Register, and Participants Schema (Prompt #10) to PostgreSQL...");

  try {
    // 1. Create directory_persons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS directory_persons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        job_title TEXT,
        grade TEXT,
        department TEXT,
        location TEXT,
        manager_email TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        is_service_account BOOLEAN NOT NULL DEFAULT false,
        external_id TEXT,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT unique_tenant_dir_email UNIQUE(tenant_id, email)
      );
    `);
    console.log("✓ directory_persons table verified/created.");

    // 2. Create approvers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS approvers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        added_by UUID NOT NULL,
        added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        removed_at TIMESTAMPTZ,
        removed_by UUID,
        note TEXT,
        CONSTRAINT unique_tenant_approver_email UNIQUE(tenant_id, email)
      );
    `);
    console.log("✓ approvers table verified/created.");

    // 3. Create approver_authorities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS approver_authorities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        approver_id UUID NOT NULL REFERENCES approvers(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        stage INT NOT NULL,
        min_value DECIMAL,
        max_value DECIMAL,
        is_required BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT unique_tenant_cat_stage_approver UNIQUE(tenant_id, category_id, stage, approver_id)
      );
    `);
    console.log("✓ approver_authorities table verified/created.");

    // 4. Create request_participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS request_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        is_external BOOLEAN NOT NULL DEFAULT false,
        added_by UUID NOT NULL,
        added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reason TEXT,
        state TEXT NOT NULL DEFAULT 'PENDING',
        responded_at TIMESTAMPTZ,
        comment TEXT,
        CONSTRAINT unique_tenant_request_email_role UNIQUE(tenant_id, request_id, email, role)
      );
    `);
    console.log("✓ request_participants table verified/created.");

    // 5. Add Category controls (who_can_raise, allow_participants, allow_external_participants)
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS who_can_raise TEXT DEFAULT 'ANYONE',
      ADD COLUMN IF NOT EXISTS allow_participants BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS allow_external_participants BOOLEAN DEFAULT false;
    `);
    console.log("✓ categories columns (who_can_raise, allow_participants, allow_external_participants) verified/created.");

    // Populate directory_persons from existing users table for seamless migration
    await client.query(`
      INSERT INTO directory_persons (tenant_id, email, full_name, job_title, grade, department, status, is_service_account)
      SELECT tenant_id, LOWER(TRIM(email)), name, designation, career_level, department, status, 
             CASE WHEN email ILIKE '%admin%' OR email ILIKE '%system%' THEN true ELSE false END
      FROM users
      ON CONFLICT (tenant_id, email) DO NOTHING;
    `);
    console.log("✓ Seeded directory_persons from existing users.");

    console.log("\nDirectory, Approver Register, and Participants schema successfully applied!");
  } catch (err) {
    console.error("Error applying schema:", err);
  } finally {
    await client.end();
  }
}

applyDirectoryApproversSchema();
