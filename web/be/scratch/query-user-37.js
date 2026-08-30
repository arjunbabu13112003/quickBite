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

  // Query user 37
  const res = await client.query(`
    SELECT id, name, email, role, "pushToken" FROM users WHERE id = 37
  `);
  console.log('User 37 details:', res.rows[0]);

  // Query active device push tokens for user 37
  const tokensRes = await client.query(`
    SELECT id, "userId", token, "appType", "isActive" FROM device_push_tokens WHERE "userId" = 37
  `);
  console.log('Device push tokens for user 37:', tokensRes.rows);

  await client.end();
}

run().catch(console.error);
