require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    const res = await client.query(`SELECT id, name, email, role, designation, department FROM users;`);
    console.log("Users:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
