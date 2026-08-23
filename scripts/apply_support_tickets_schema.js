import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function applySupportTicketsSchema() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- APPLYING SUPPORT TICKETS SCHEMA ---');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        requester_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'MEDIUM',
        status VARCHAR(50) DEFAULT 'OPEN',
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
    `);

    console.log('✓ Created support_tickets table and indexes successfully.');
  } catch (err) {
    console.error('Error applying support_tickets schema:', err);
  } finally {
    await client.end();
  }
}

applySupportTicketsSchema();
