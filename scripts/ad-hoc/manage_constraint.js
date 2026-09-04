require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const action = process.argv[2];
  if (action !== 'drop' && action !== 'restore') {
    console.error("Please specify 'drop' or 'restore'");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  await client.connect();
  try {
    if (action === 'drop') {
      console.log("Dropping constraint users_auth_user_id_fkey...");
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;`);
      console.log("Dropped successfully.");
    } else {
      console.log("Restoring constraint users_auth_user_id_fkey...");
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_auth_user_id_fkey 
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
      `);
      console.log("Restored successfully.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
