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

  // Query customers
  const res = await client.query(`
    SELECT id, name, email, role, "pushToken" 
    FROM users 
    WHERE role = 'customer'
    ORDER BY id ASC
  `);

  console.log('--- CUSTOMERS LIST ---');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
