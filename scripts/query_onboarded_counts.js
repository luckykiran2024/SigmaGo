import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || 'postgresql://postgres.mawiqviucthalwyfvmfr:S%40%40nv%21%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

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
