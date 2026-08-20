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
    SELECT id, email, role
    FROM users 
    WHERE role='super_admin'
    LIMIT 5
  `);
  console.log("Super Admins:", res.rows);
  await client.end();
}
run().catch(console.error);
