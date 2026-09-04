require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    // Check if column already exists
    const checkRes = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'approval_requests' AND column_name = 'beneficiary_id';
    `);
    
    if (checkRes.rows.length > 0) {
      console.log("Column beneficiary_id already exists. Skipping.");
    } else {
      console.log("Adding beneficiary_id column...");
      await client.query(`ALTER TABLE approval_requests ADD COLUMN beneficiary_id UUID REFERENCES users(id) ON DELETE SET NULL;`);
      console.log("Column added successfully.");
    }

    // Check if index already exists
    const idxRes = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'approval_requests' AND indexname = 'idx_approval_requests_beneficiary';
    `);
    
    if (idxRes.rows.length > 0) {
      console.log("Index already exists. Skipping.");
    } else {
      console.log("Creating index on beneficiary_id...");
      await client.query(`CREATE INDEX idx_approval_requests_beneficiary ON approval_requests (beneficiary_id);`);
      console.log("Index created successfully.");
    }

    console.log("Done! Schema migration complete.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

main();
