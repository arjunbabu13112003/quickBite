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

  const partnerToken = 'ExponentPushToken[UgrZCuGotSqvqkY1I1nnsb]';
  const customerToken = 'ExponentPushToken[CTxiRtKKvkeHaXpoTXLZdF]';

  // Clear Delivery Partner token from users table
  await client.query(`UPDATE users SET "pushToken" = NULL WHERE "pushToken" = '${partnerToken}'`);
  console.log('Cleared Delivery Partner push tokens from users table.');

  // Create table entry for Kannan
  const existKannan = await client.query(`SELECT 1 FROM device_push_tokens WHERE token = '${partnerToken}'`);
  if (existKannan.rows.length === 0) {
    await client.query(`
      INSERT INTO device_push_tokens("userId", token, "appType", "isActive", "createdAt", "updatedAt")
      VALUES (3, '${partnerToken}', 'DELIVERY_PARTNER', true, NOW(), NOW())
    `);
    console.log('Inserted Kannan Delivery Partner token.');
  } else {
    await client.query(`
      UPDATE device_push_tokens
      SET "userId" = 3, "appType" = 'DELIVERY_PARTNER', "isActive" = true
      WHERE token = '${partnerToken}'
    `);
    console.log('Updated Kannan Delivery Partner token.');
  }

  // Create table entry for Test Customer
  const existCustomer = await client.query(`SELECT 1 FROM device_push_tokens WHERE token = '${customerToken}'`);
  if (existCustomer.rows.length === 0) {
    await client.query(`
      INSERT INTO device_push_tokens("userId", token, "appType", "isActive", "createdAt", "updatedAt")
      VALUES (21, '${customerToken}', 'CUSTOMER', true, NOW(), NOW())
    `);
    console.log('Inserted Test Customer token.');
  } else {
    await client.query(`
      UPDATE device_push_tokens
      SET "userId" = 21, "appType" = 'CUSTOMER', "isActive" = true
      WHERE token = '${customerToken}'
    `);
    console.log('Updated Test Customer token.');
  }

  // Clean recipient rows
  await client.query(`
    UPDATE push_campaign_recipients
    SET status = 'no-token', "errorMessage" = 'Isolating Delivery Partner token'
    WHERE "pushToken" = '${partnerToken}'
  `);
  console.log('Cleaned campaign recipient rows.');

  await client.end();
}

run().catch(console.error);
