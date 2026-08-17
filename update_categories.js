require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();

  console.log("Updating categories for Meridian Corp...");
  const meridianId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c';

  // 1. Rename existing categories
  await client.query('UPDATE categories SET name = $1 WHERE id = $2', ['Structural', '730cec72-0f93-433a-b551-297c9b4e4bdf']);
  await client.query('UPDATE categories SET name = $1 WHERE id = $2', ['Transaction', '8d8ab89f-28e5-46b9-b84b-34b13e57ea67']);
  await client.query('UPDATE categories SET name = $1 WHERE id = $2', ['Exception', 'f58cfc5c-2327-4fa4-9491-93dd16956f19']);

  // 2. Insert 'Process' category if not exists
  const checkProcess = await client.query('SELECT id FROM categories WHERE tenant_id = $1 AND name = $2', [meridianId, 'Process']);
  if (checkProcess.rows.length === 0) {
    await client.query('INSERT INTO categories (id, tenant_id, name, default_sla_hours) VALUES (gen_random_uuid(), $1, $2, 48)', [meridianId, 'Process']);
  }

  // Fetch updated list
  const res = await client.query('SELECT id, name FROM categories WHERE tenant_id = $1 ORDER BY name;', [meridianId]);
  console.log("Updated Categories:", res.rows);

  await client.end();
}

main().catch(console.error);
