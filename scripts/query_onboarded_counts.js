import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error('FATAL: Database connection URL is missing. Set DATABASE_URL or DIRECT_URL in environment.');
}

async function queryCounts() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const summaryRes = await client.query(`
      SELECT 
        t.id,
        t.name,
        t.subdomain,
        t.plan,
        COUNT(u.id)::int AS user_count,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END)::int AS admin_count,
        COUNT(CASE WHEN u.role = 'member' THEN 1 END)::int AS member_count,
        t.created_at
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      GROUP BY t.id, t.name, t.subdomain, t.plan, t.created_at
      ORDER BY t.created_at ASC
    `);

    console.log('\n======================================================');
    console.log('         SIGMAGO SUPABASE DATABASE REPORT             ');
    console.log('======================================================\n');
    console.log(`TOTAL CLIENTS / TENANTS ONBOARDED : ${summaryRes.rowCount}`);

    const totalUsersRes = await client.query(`SELECT COUNT(*)::int AS total FROM users`);
    console.log(`TOTAL USERS ONBOARDED             : ${totalUsersRes.rows[0].total}\n`);

    console.log('--- CLIENT / TENANT SUMMARY TABLE ---');
    console.table(summaryRes.rows);

  } catch (err) {
    console.error('Error querying Supabase:', err);
  } finally {
    await client.end();
  }
}

queryCounts();
