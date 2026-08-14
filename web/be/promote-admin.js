const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env manually
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    process.env[key] = value;
  });
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Error: Please provide an email address.');
  console.log('Usage: node promote-admin.js <email>');
  process.exit(1);
}

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'food_ordering',
});

async function main() {
  try {
    await client.connect();
    
    // Check if user exists
    const checkRes = await client.query('SELECT id, role FROM users WHERE email = $1', [email]);
    if (checkRes.rowCount === 0) {
      console.error(`❌ Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    const user = checkRes.rows[0];
    console.log(`Found user: ID=${user.id}, Current Role=${user.role}`);

    // Update role
    await client.query('UPDATE users SET role = \'super_admin\' WHERE email = $1', [email]);
    console.log(`🎉 Success: User "${email}" has been promoted to "super_admin".`);
  } catch (err) {
    console.error('❌ Error executing script:', err.message);
  } finally {
    await client.end();
  }
}

main();
