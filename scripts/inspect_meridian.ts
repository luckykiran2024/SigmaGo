import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c';

  const { rows: breakdown } = await client.query(`
    SELECT resolved_step_type, count(*) 
    FROM approval_requests 
    WHERE tenant_id = $1 
    GROUP BY resolved_step_type
  `, [tenantId]);
  console.log('Breakdown by step_type:', breakdown);

  const { rows: currentReqs } = await client.query(`
    SELECT id, ref, subject, resolved_step_type 
    FROM approval_requests 
    WHERE tenant_id = $1 AND created_at >= '2026-01-01'
    ORDER BY ref ASC
  `, [tenantId]);
  console.log('Current (2026) requests count:', currentReqs.length);

  const { rows: policies } = await client.query(`
    SELECT id, title FROM policies WHERE tenant_id = $1
  `, [tenantId]);
  console.log('Policies in Meridian count:', policies.length, policies.map(p => ({ id: p.id, title: p.title })));

  await client.end();
}
inspect().catch(console.error);
