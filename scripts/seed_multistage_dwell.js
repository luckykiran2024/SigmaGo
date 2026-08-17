const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function seedMultiStageDwell() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- SEEDING 3-STAGE FINALIZED REQUEST FOR DWELL MEASUREMENT ---');

  try {
    const tenantRes = await client.query(`SELECT id FROM tenants WHERE subdomain = 'meridian' LIMIT 1`);
    const tenantId = tenantRes.rows[0].id;

    const reqId = '13000000-0000-0000-0000-000000000099';
    const hash = require('crypto').createHash('sha256').update('REQ-2026-0099-multi-stage').digest('hex');

    await client.query(`
      INSERT INTO approval_requests (id, ref, tenant_id, owner_id, category_id, subject, status, checksum_sha256, finalized_at)
      VALUES (
        '${reqId}',
        'REQ-2026-0099',
        '${tenantId}',
        'a1000000-0000-0000-0000-000000000004',
        '12000000-0000-0000-0000-000000000001',
        'Multi-stage Procurement Exception Request',
        'approved',
        '${hash}',
        '2026-08-17T18:00:00.000Z'
      ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    `);

    // Day 1 (Aug 15 -> Aug 15 4h later)
    const day1Entered = '2026-08-15T09:00:00.000Z';
    const day1Acted = '2026-08-15T13:00:00.000Z';

    // Day 2 (Aug 15 13:00 -> Aug 16 11:30)
    const day2Entered = '2026-08-15T13:00:00.000Z';
    const day2Acted = '2026-08-16T11:30:00.000Z';

    // Day 3 (Aug 16 11:30 -> Aug 17 18:00)
    const day3Entered = '2026-08-16T11:30:00.000Z';
    const day3Acted = '2026-08-17T18:00:00.000Z';

    await client.query(`
      INSERT INTO approval_steps (id, request_id, approver_id, order_index, stage_index, type, status, entered_at, acted_at, comment)
      VALUES 
        ('99000000-0000-0000-0000-000000000001', '${reqId}', 'a1000000-0000-0000-0000-000000000001', 0, 0, 'GENERAL', 'approved', '${day1Entered}', '${day1Acted}', 'Approved stage 1'),
        ('99000000-0000-0000-0000-000000000002', '${reqId}', 'a1000000-0000-0000-0000-000000000002', 1, 1, 'GENERAL', 'approved', '${day2Entered}', '${day2Acted}', 'Approved stage 2'),
        ('99000000-0000-0000-0000-000000000003', '${reqId}', 'a1000000-0000-0000-0000-000000000003', 2, 2, 'GENERAL', 'approved', '${day3Entered}', '${day3Acted}', 'Final stage approval')
      ON CONFLICT (id) DO UPDATE SET entered_at = EXCLUDED.entered_at, acted_at = EXCLUDED.acted_at;
    `);

    console.log('✓ Seeded REQ-2026-0099 with 3 sequential stage transitions');
  } catch (err) {
    console.error('Error seeding multi-stage dwell request:', err);
  } finally {
    await client.end();
  }
}

seedMultiStageDwell();
