const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'arjun@@12345',
  database: 'food_ordering'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT t.id, t."userId", t.token, t."appType", t."isActive", u.name, u.role
    FROM device_push_tokens t
    LEFT JOIN users u ON t."userId" = u.id
    ORDER BY t.id DESC
  `);
  console.log("Device Push Tokens:", res.rows);
  await client.end();
}
run().catch(console.error);
