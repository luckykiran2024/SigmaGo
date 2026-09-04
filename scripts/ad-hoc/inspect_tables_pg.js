require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Tables in database:", res.rows.map(r => r.table_name));
    
    // Also inspect columns for users and approval_requests
    for (const tableName of ['users', 'approval_requests', 'approval_steps', 'User', 'ApprovalRequest']) {
      const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY column_name;
      `, [tableName]);
      if (colRes.rows.length > 0) {
        console.log(`Columns for ${tableName}:`, colRes.rows);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
