require('dotenv').config();
const { Client } = require('pg');

async function cloneSchema() {
  const primaryUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const testUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

  if (!testUrl) {
    throw new Error('FATAL: Database connection URL is missing. Set DATABASE_URL or DIRECT_URL in environment.');
  }

  const primaryClient = new Client({ connectionString: primaryUrl });
  const testClient = new Client({ connectionString: testUrl });

  await primaryClient.connect();
  await testClient.connect();

  try {
    const tableRes = await primaryClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    console.log(`Found ${tableRes.rows.length} tables in primary database.`);

    await testClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await testClient.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await testClient.query('CREATE SEQUENCE IF NOT EXISTS request_seq START 1;');

    for (const row of tableRes.rows) {
      const tableName = row.table_name;
      const colsRes = await primaryClient.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1;
      `, [tableName]);

      const colDefs = colsRes.rows.map(c => {
        let type = c.udt_name;
        if (type === 'uuid') type = 'UUID';
        else if (type === 'varchar' || type === 'text') type = 'TEXT';
        else if (type === 'int4') type = 'INT';
        else if (type === 'bool') type = 'BOOLEAN';
        else if (type === 'timestamptz') type = 'TIMESTAMPTZ';
        else if (type === 'jsonb' || type === 'json') type = 'JSONB';
        else type = 'TEXT';
        return `"${c.column_name}" ${type}`;
      }).join(', ');

      const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs});`;
      await testClient.query(createSql);
      console.log(`Created table ${tableName} on sigmago_test.`);
    }

    console.log('Schema cloning complete!');
  } catch (err) {
    console.error('Error cloning schema:', err.message);
  } finally {
    await primaryClient.end();
    await testClient.end();
  }
}

cloneSchema();
