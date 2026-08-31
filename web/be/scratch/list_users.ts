import { Client } from 'pg';

async function run() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'arjun@@12345',
    database: 'food_ordering'
  });

  await client.connect();

  console.log('--- Listing first 20 users ---');
  const res = await client.query(`
    SELECT id, name, email, role, "mobileNumber" FROM users LIMIT 20
  `);
  console.log(res.rows);

  await client.end();
}

run().catch(console.error);
