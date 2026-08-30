const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'food_ordering',
  });

  await client.connect();
  console.log('Connected to PG Database for monitoring push tokens!');
  console.log('Waiting for changes to user 37 push tokens...\n');

  let lastTokens = null;

  while (true) {
    try {
      const res = await client.query(`
        SELECT id, "userId", token, "appType", "isActive", "createdAt", "updatedAt"
        FROM device_push_tokens
        WHERE "userId" = 37
        ORDER BY id DESC
      `);
      
      const currentJson = JSON.stringify(res.rows);
      if (lastTokens === null || lastTokens !== currentJson) {
        lastTokens = currentJson;
        console.log(`[${new Date().toISOString()}] USER 37 DEVICE PUSH TOKENS:`);
        if (res.rows.length === 0) {
          console.log('  No tokens found.');
        } else {
          res.rows.forEach(row => {
            console.log(`  ID: ${row.id} | Active: ${row.isActive} | Token: ${row.token} | Created: ${row.createdAt.toISOString()} | Updated: ${row.updatedAt.toISOString()}`);
          });
        }
        console.log('--------------------------------------------------------------------------------------------------------');
      }
    } catch (e) {
      console.error('Query error:', e);
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
  }
}

run().catch(console.error);
