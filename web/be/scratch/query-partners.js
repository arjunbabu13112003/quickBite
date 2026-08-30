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

  // Query delivery partners
  const res = await client.query(`
    SELECT id, "userId", "phoneNumber", "vehicleType", "accountStatus"
    FROM delivery_partners
    ORDER BY id ASC
  `);

  console.log('--- DELIVERY PARTNERS LIST ---');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
