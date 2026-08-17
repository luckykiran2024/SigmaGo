// @ts-ignore
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL is not set.');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- Starting Multi-Tenant Functional Test Seeding ---');

  try {
    // 1. Create Tenant A (Meridian Corp) & Tenant B (Northgate Industries)
    await client.query(`
      INSERT INTO tenants (id, name, subdomain, region)
      VALUES 
        ('11111111-1111-1111-1111-111111111111', 'Meridian Corp', 'meridian', 'ap-south-2')
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name;

      INSERT INTO tenants (id, name, subdomain, region)
      VALUES 
        ('22222222-2222-2222-2222-222222222222', 'Northgate Industries', 'northgate', 'ap-south-2')
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name;
    `);

    // Fetch resolved tenant IDs
    const tA = (await client.query(`SELECT id FROM tenants WHERE subdomain = 'meridian'`)).rows[0].id;
    const tB = (await client.query(`SELECT id FROM tenants WHERE subdomain = 'northgate'`)).rows[0].id;

    console.log(`✓ Tenants Meridian Corp (${tA}) & Northgate Industries (${tB}) verified`);

    // 2. Create Tenant A Users
    await client.query(`
      INSERT INTO users (id, tenant_id, email, name, role, designation, status)
      VALUES 
        ('a1000000-0000-0000-0000-000000000001', '${tA}', 'vijay.reddy@meridian.com', 'Vijay Reddy', 'admin', 'Managing Director', 'active'),
        ('a1000000-0000-0000-0000-000000000002', '${tA}', 'krishna.pillai@meridian.com', 'Krishna Pillai', 'member', 'Head of People', 'active'),
        ('a1000000-0000-0000-0000-000000000003', '${tA}', 'anand.kulkarni@meridian.com', 'Anand Kulkarni', 'member', 'VP Finance', 'active'),
        ('a1000000-0000-0000-0000-000000000004', '${tA}', 'arjun.bose@meridian.com', 'Arjun Bose', 'member', 'Procurement Manager', 'active'),
        ('a1000000-0000-0000-0000-000000000005', '${tA}', 'gaurav.bose@meridian.com', 'Gaurav Bose', 'member', 'Operations Executive', 'active'),
        ('a1000000-0000-0000-0000-000000000006', '${tA}', 'priya.rao@meridian.com', 'Priya Rao', 'member', 'Staff Associate', 'active'),
        ('a1000000-0000-0000-0000-000000000007', '${tA}', 'megha.bose@meridian.com', 'Megha Bose', 'member', 'Inert Staff', 'active'),
        ('a1000000-0000-0000-0000-000000000008', '${tA}', 'sunita.iyer@meridian.com', 'Sunita Iyer', 'member', 'Audit Analyst', 'active')
      ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
    `);

    // Create Tenant B Users
    await client.query(`
      INSERT INTO users (id, tenant_id, email, name, role, designation, status)
      VALUES 
        ('b2000000-0000-0000-0000-000000000001', '${tB}', 'ceo@northgate.com', 'Rohan Sharma', 'admin', 'CEO', 'active'),
        ('b2000000-0000-0000-0000-000000000002', '${tB}', 'finance@northgate.com', 'Neha Verma', 'member', 'CFO', 'active'),
        ('b2000000-0000-0000-0000-000000000003', '${tB}', 'staff@northgate.com', 'Amit Shah', 'member', 'Manager', 'active')
      ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
    `);
    console.log('✓ Users for Meridian & Northgate seeded');

    // 3. Seed Intelligence Grants (§0)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await client.query(`
      INSERT INTO intelligence_grants (id, tenant_id, email, scope, granted_by, expires_at)
      VALUES 
        ('10000000-0000-0000-0000-000000000001', '${tA}', 'krishna.pillai@meridian.com', 'FULL', 'a1000000-0000-0000-0000-000000000001', NULL),
        ('10000000-0000-0000-0000-000000000002', '${tA}', 'anand.kulkarni@meridian.com', 'AGGREGATE_ONLY', 'a1000000-0000-0000-0000-000000000001', NULL),
        ('10000000-0000-0000-0000-000000000003', '${tA}', 'sunita.iyer@meridian.com', 'AGGREGATE_ONLY', 'a1000000-0000-0000-0000-000000000001', '${yesterday}')
      ON CONFLICT (tenant_id, email) DO UPDATE SET scope = EXCLUDED.scope, expires_at = EXCLUDED.expires_at;
    `);
    console.log('✓ Intelligence Grants seeded');

    // 4. Seed Approvers & Approver Authorities (§0)
    await client.query(`
      INSERT INTO approvers (id, tenant_id, email, added_by)
      VALUES 
        ('ae100000-0000-0000-0000-000000000001', '${tA}', 'vijay.reddy@meridian.com', 'a1000000-0000-0000-0000-000000000001'),
        ('ae100000-0000-0000-0000-000000000002', '${tA}', 'krishna.pillai@meridian.com', 'a1000000-0000-0000-0000-000000000001'),
        ('ae100000-0000-0000-0000-000000000003', '${tA}', 'anand.kulkarni@meridian.com', 'a1000000-0000-0000-0000-000000000001'),
        ('ae100000-0000-0000-0000-000000000004', '${tA}', 'arjun.bose@meridian.com', 'a1000000-0000-0000-0000-000000000001'),
        ('ae100000-0000-0000-0000-000000000007', '${tA}', 'megha.bose@meridian.com', 'a1000000-0000-0000-0000-000000000001')
      ON CONFLICT (tenant_id, email) DO NOTHING;
    `);

    // 5. Seed Policies (§0)
    await client.query(`
      INSERT INTO policies (id, tenant_id, title, statement, reasoning, status, created_by)
      VALUES 
        ('11000000-0000-0000-0000-000000000001', '${tA}', 'Procurement Threshold Policy', 'Increments above 12% require written approval from functional VP and CFO.', 'Enforces budget discipline across operational expenditure.', 'ACTIVE', 'a1000000-0000-0000-0000-000000000001'),
        ('11000000-0000-0000-0000-000000000002', '${tA}', 'Legacy Travel Policy', 'All travel must be booked 14 days in advance.', 'Old policy superseded by modern guidelines.', 'RETIRED', 'a1000000-0000-0000-0000-000000000001'),
        ('11000000-0000-0000-0000-000000000003', '${tA}', 'Special Compensation Policy', 'Executive bonuses subject to Board approval.', 'Small scale policy for Impact Factor 2 test.', 'ACTIVE', 'a1000000-0000-0000-0000-000000000001'),
        ('22000000-0000-0000-0000-000000000001', '${tB}', 'Northgate Capital Expenditure Policy', 'Capex above 50L requires Board review.', 'Northgate confidential policy.', 'ACTIVE', 'b2000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✓ Policies seeded');

    // 6. Seed Categories (§0)
    await client.query(`
      INSERT INTO categories (id, tenant_id, name, step_type, governing_policy_id, exclude_from_intelligence, allow_external_participants)
      VALUES 
        ('12000000-0000-0000-0000-000000000001', '${tA}', 'Capex Exception', 'EXCEPTION', '11000000-0000-0000-0000-000000000001', false, true),
        ('12000000-0000-0000-0000-000000000002', '${tA}', 'Executive Compensation', 'TRANSACTIONAL', NULL, true, false),
        ('12000000-0000-0000-0000-000000000003', '${tA}', 'General Procurement', 'TRANSACTIONAL', NULL, false, true),
        ('22000000-0000-0000-0000-000000000002', '${tB}', 'Northgate Confidential Purchase', 'TRANSACTIONAL', NULL, false, false)
      ON CONFLICT (tenant_id, name) DO NOTHING;
    `);
    console.log('✓ Categories seeded');

    // 7. Seed Requests, Steps & Decision References (§0)
    await client.query(`
      INSERT INTO approval_requests (id, ref, tenant_id, owner_id, category_id, subject, status, checksum_sha256, finalized_at)
      VALUES 
        ('13000000-0000-0000-0000-000000000001', 'REQ-2026-0001', '${tA}', 'a1000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000001', 'Vendor Price Hike Exception Request', 'approved', 'sha256-sealed-checksum-001', now()),
        ('13000000-0000-0000-0000-000000000002', 'REQ-2026-0002', '${tA}', 'a1000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000003', 'Mid-flight Software License Renewal', 'pending', NULL, NULL),
        ('13000000-0000-0000-0000-000000000003', 'REQ-2026-0003', '${tA}', 'a1000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000001', 'Unjustified Equipment Purchase', 'rejected', NULL, now()),
        ('23000000-0000-0000-0000-000000000001', 'REQ-2026-N001', '${tB}', 'b2000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000002', 'Northgate Secret Server Expansion', 'approved', 'sha256-northgate-sealed-01', now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed decision_references for EXCEPTION_TO policy
    await client.query(`
      INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by)
      VALUES 
        ('14000000-0000-0000-0000-000000000001', '${tA}', '13000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'EXCEPTION_TO', 'a1000000-0000-0000-0000-000000000004')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('--- Multi-Tenant Functional Test Data Seeded Successfully ---');
  } catch (err) {
    console.error('Error seeding test fixtures:', err);
  } finally {
    await client.end();
  }
}

seed();
