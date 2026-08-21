require('dotenv').config();
const { Client } = require('pg');

async function createTestDb() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('CREATE DATABASE sigmago_test;');
    console.log('Database sigmago_test created successfully.');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database sigmago_test already exists.');
    } else {
      console.log('Database creation note:', err.message);
    }
  } finally {
    await client.end();
  }
}

createTestDb();
