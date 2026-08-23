import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function queryUserRoles() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows: users } = await client.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, t.name as tenant_name, t.subdomain
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY t.name, u.role, u.name
    `);

    console.log('\n--- ALL USERS & ROLES IN DATABASE ---');
    console.table(users);

    const rolesCount = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    console.log('\nRole breakdown:', rolesCount);
  } catch (err) {
    console.error('Error querying user roles:', err);
  } finally {
    await client.end();
  }
}

queryUserRoles();
