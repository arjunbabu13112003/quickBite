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

  const token = 'ExponentPushToken[CTxiRtKKvkeHaXpoTXLZdF]';
  const userId = 37;

  // Deactivate existing active tokens for user 37 and appType CUSTOMER
  await client.query(`
    UPDATE device_push_tokens
    SET "isActive" = false
    WHERE "userId" = ${userId} AND "appType" = 'CUSTOMER' AND "isActive" = true
  `);

  // Insert or update token for user 37 as CUSTOMER and active
  const checkToken = await client.query(`
    SELECT id FROM device_push_tokens WHERE token = '${token}'
  `);

  if (checkToken.rows.length > 0) {
    await client.query(`
      UPDATE device_push_tokens
      SET "userId" = ${userId}, "appType" = 'CUSTOMER', "isActive" = true
      WHERE token = '${token}'
    `);
    console.log(`Updated token for user ${userId} to be active.`);
  } else {
    await client.query(`
      INSERT INTO device_push_tokens("userId", token, "appType", "isActive", "createdAt", "updatedAt")
      VALUES (${userId}, '${token}', 'CUSTOMER', true, NOW(), NOW())
    `);
    console.log(`Inserted new active customer token for user ${userId}.`);
  }

  // Double check table contents
  const res = await client.query(`
    SELECT id, "userId", token, "appType", "isActive"
    FROM device_push_tokens
    WHERE "userId" = ${userId}
  `);
  console.log('--- DEVICE PUSH TOKENS FOR USER 37 ---');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
