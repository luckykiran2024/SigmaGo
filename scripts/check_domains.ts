import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkDomains() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c';

  const { rows } = await client.query(`
    SELECT r.id, r.ref, r.subject, r.resolved_step_type, c.domain
    FROM approval_requests r
    JOIN categories c ON r.category_id = c.id
    WHERE r.tenant_id = $1
    ORDER BY r.created_at ASC
  `, [tenantId]);

  console.log('Total reqs with domain:', rows.length);
  const byType: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  rows.forEach(r => {
    byType[r.resolved_step_type] = (byType[r.resolved_step_type] || 0) + 1;
    byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
  });
  console.log('By step type:', byType);
  console.log('By domain:', byDomain);

  await client.end();
}
checkDomains().catch(console.error);
