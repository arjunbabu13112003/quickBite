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

  // Query latest campaign
  const campaignRes = await client.query(`
    SELECT id, title, status, stats, "lastError"
    FROM push_campaigns
    ORDER BY id DESC
    LIMIT 1
  `);

  if (campaignRes.rows.length === 0) {
    console.log('No push campaigns found.');
    await client.end();
    return;
  }

  const campaign = campaignRes.rows[0];
  console.log('\n--- LATEST CAMPAIGN DETAILS ---');
  console.log(campaign);

  // Query recipients for this campaign
  const recipientsRes = await client.query(`
    SELECT r.id, r."userId", u.name, r."pushToken", r.status, r."expoTicketId", r."errorMessage", r."processedAt"
    FROM push_campaign_recipients r
    LEFT JOIN users u ON u.id = r."userId"
    WHERE r."campaignId" = $1
    ORDER BY r.id ASC
  `, [campaign.id]);

  console.log(`\n--- RECIPIENT ROWS FOR CAMPAIGN #${campaign.id} ---`);
  console.table(recipientsRes.rows.map(r => ({
    userId: r.userId,
    name: r.name,
    pushTokenPresent: r.pushToken ? 'YES' : 'NO',
    status: r.status,
    expoTicketId: r.expoTicketId || 'null',
    errorMessage: r.errorMessage || 'null',
    processedAt: r.processedAt
  })));

  await client.end();
}

run().catch(console.error);
