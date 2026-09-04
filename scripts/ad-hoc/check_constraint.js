require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conname = 'users_auth_user_id_fkey';
    `);
    console.log("Constraint definition:", res.rows[0]?.def);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
