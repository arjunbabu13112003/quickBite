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

  console.log('--- Finding SUPER_ADMIN Users ---');
  const res = await client.query(`
    SELECT id, name, email, role FROM users WHERE role = 'SUPER_ADMIN'
  `);
  console.log(res.rows);

  await client.end();
}

run().catch(console.error);
