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
  console.log('Polling database for push tokens... Press Ctrl+C to stop.');
  
  const seenTokens = new Set();
  
  while (true) {
    const res = await client.query('SELECT id, name, email, role, "pushToken" FROM users WHERE "pushToken" IS NOT NULL');
    for (const row of res.rows) {
      const key = `${row.id}-${row.pushToken}`;
      if (!seenTokens.has(key)) {
        seenTokens.add(key);
        console.log(`[TOKEN REGISTERED] User #${row.id} (${row.name}, ${row.role}) - Token: ${row.pushToken}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

run().catch(console.error);
