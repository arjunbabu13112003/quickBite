const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'arjun@@12345',
  database: 'postgres',
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'food_ordering_test'");
  if (res.rows.length === 0) {
    console.log('Creating database food_ordering_test...');
    await client.query('CREATE DATABASE food_ordering_test');
    console.log('Database food_ordering_test created successfully.');
  } else {
    console.log('Database food_ordering_test already exists.');
  }
  await client.end();
}

run().catch(console.error);
