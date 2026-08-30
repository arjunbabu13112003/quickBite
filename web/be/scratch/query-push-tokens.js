const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5000,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'quickbite',
  });

  await client.connect();
  console.log('Connected to PG Database!');

  // Query device_push_tokens
  const res = await client.query(`
    SELECT id, "userId", token, "appType", "isActive"
    FROM device_push_tokens
    ORDER BY id ASC
  `);

  console.log('--- DEVICE PUSH TOKENS LIST ---');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
