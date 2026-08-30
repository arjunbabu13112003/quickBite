const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'arjun@@12345',
  database: 'food_ordering'
});

async function run() {
  await client.connect();
  const hashedPassword = await bcrypt.hash('arjun123', 10);
  await client.query(`
    UPDATE users 
    SET password = $1 
    WHERE email = 'arjun@gmail.com'
  `, [hashedPassword]);
  console.log("Password updated successfully for arjun@gmail.com!");
  await client.end();
}
run().catch(console.error);
