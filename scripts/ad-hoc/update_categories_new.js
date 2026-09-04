require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();

  console.log("Updating database categories to: Structural, Transactional, Exception, Process...");

  // 1. Get all tenants
  const tenantsRes = await client.query('SELECT id, subdomain FROM tenants;');
  const tenants = tenantsRes.rows;

  const targetCategories = ['Structural', 'Transactional', 'Exception', 'Process'];

  for (const tenant of tenants) {
    console.log(`Processing tenant ${tenant.subdomain} (${tenant.id})...`);
    
    // Fetch existing categories for tenant
    const existingRes = await client.query('SELECT id, name FROM categories WHERE tenant_id = $1 ORDER BY created_at ASC;', [tenant.id]);
    const existing = existingRes.rows;

    // Update first 4 categories if present, or insert missing ones
    for (let i = 0; i < targetCategories.length; i++) {
      const targetName = targetCategories[i];
      if (existing[i]) {
        await client.query('UPDATE categories SET name = $1 WHERE id = $2;', [targetName, existing[i].id]);
        console.log(`Updated category ID ${existing[i].id} to "${targetName}"`);
      } else {
        await client.query('INSERT INTO categories (id, tenant_id, name, default_sla_hours) VALUES (gen_random_uuid(), $1, $2, 48);', [tenant.id, targetName]);
        console.log(`Inserted new category "${targetName}" for tenant ${tenant.subdomain}`);
      }
    }

    // Delete any extra categories beyond the 4 specified
    if (existing.length > 4) {
      for (let i = 4; i < existing.length; i++) {
        // Only delete if no approval requests reference this category
        const reqCheck = await client.query('SELECT COUNT(*) FROM approval_requests WHERE category_id = $1;', [existing[i].id]);
        if (parseInt(reqCheck.rows[0].count, 10) === 0) {
          await client.query('DELETE FROM categories WHERE id = $1;', [existing[i].id]);
          console.log(`Deleted unused category ID ${existing[i].id} (${existing[i].name})`);
        }
      }
    }
  }

  const finalRes = await client.query('SELECT id, name, tenant_id FROM categories ORDER BY name;');
  console.log("\nFinal Categories in Database:", finalRes.rows);

  await client.end();
}

main().catch(console.error);
