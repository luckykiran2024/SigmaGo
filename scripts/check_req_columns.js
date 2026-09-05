require('dotenv').config();
const pg = require('pg');
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'approval_requests'");
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}).catch(console.error);
