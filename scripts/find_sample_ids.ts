import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function findSampleIds() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c';

  const { rows: orphan } = await client.query(`
    SELECT id, ref, subject 
    FROM approval_requests 
    WHERE tenant_id = $1 AND ref = 'TRX-2026-095'
  `, [tenantId]);

  const { rows: connected } = await client.query(`
    SELECT id, ref, subject 
    FROM approval_requests 
    WHERE tenant_id = $1 AND ref = 'PRC-2026-021'
  `, [tenantId]);

  console.log('Orphan sample:', orphan[0]);
  console.log('Connected sample:', connected[0]);

  await client.end();
}
findSampleIds().catch(console.error);
