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

  // Query notifications for user 21 and 3
  const res = await client.query(`
    SELECT id, "userId", "campaignId", title, body, "isRead", type, data, "createdAt"
    FROM customer_notifications
    WHERE "userId" IN (21, 3) OR "campaignId" = 6
    ORDER BY id DESC
  `);

  console.log('--- INBOX NOTIFICATIONS ---');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
