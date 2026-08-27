const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'arjun@@12345',
  database: 'food_ordering',
});

async function run() {
  await client.connect();
  
  const users = await client.query('SELECT id, name, email, role, "pushToken" FROM users');
  console.log('USERS:', JSON.stringify(users.rows, null, 2));
  
  const assignments = await client.query('SELECT * FROM hotel_admins');
  console.log('ASSIGNMENTS:', JSON.stringify(assignments.rows, null, 2));
  
  const hotels = await client.query('SELECT id, name, "isActive", "isOpen" FROM hotels');
  console.log('HOTELS:', JSON.stringify(hotels.rows, null, 2));
  
  await client.end();
}

run().catch(console.error);
