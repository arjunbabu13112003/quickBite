const { Client } = require('pg');

async function run() {
  const devClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'arjun@@12345',
    database: 'food_ordering',
  });

  await devClient.connect();

  const devRes = await devClient.query('SELECT count(*) FROM orders');
  console.log('Dev DB orders count:', devRes.rows[0].count);

  const devSample = await devClient.query('SELECT id, "orderNumber" FROM orders LIMIT 10');
  console.log('Dev DB sample orders:', devSample.rows);

  await devClient.end();
}

run().catch(console.error);
