require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    console.log("Deleting 0_init from _prisma_migrations...");
    const res = await client.query(`DELETE FROM _prisma_migrations WHERE migration_name = '0_init';`);
    console.log("Deleted rows:", res.rowCount);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
