const { Client } = require('pg');

async function cloneDatabase() {
  const sourceClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'arjun@@12345',
    database: 'food_ordering',
  });

  const targetClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'arjun@@12345',
    database: 'food_ordering_test',
  });

  await sourceClient.connect();
  await targetClient.connect();

  console.log('Connected to source and target databases.');

  // Disable all constraints/triggers in target database
  await targetClient.query("SET session_replication_role = 'replica';");

  // Get table names in source database
  const sourceTablesRes = await sourceClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const sourceTables = sourceTablesRes.rows.map(r => r.table_name);

  // Get table names in target database
  const targetTablesRes = await targetClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const targetTables = new Set(targetTablesRes.rows.map(r => r.table_name));

  // Intersection
  const tables = sourceTables.filter(t => targetTables.has(t));
  console.log('Intersection of tables to clone:', tables);

  for (const table of tables) {
    // Truncate target table
    await targetClient.query(`TRUNCATE TABLE "${table}" CASCADE;`);

    // Fetch data from source
    const sourceData = await sourceClient.query(`SELECT * FROM "${table}"`);
    if (sourceData.rows.length === 0) {
      console.log(`Table "${table}" is empty.`);
      continue;
    }

    // Prepare insert query
    const columns = Object.keys(sourceData.rows[0]).map(col => `"${col}"`).join(', ');
    const colNames = Object.keys(sourceData.rows[0]);
    
    console.log(`Cloning ${sourceData.rows.length} rows for table "${table}"...`);

    for (const row of sourceData.rows) {
      const placeholders = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = colNames.map(col => {
        const val = row[col];
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          return JSON.stringify(val);
        }
        return val;
      });
      await targetClient.query(
        `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`,
        values
      );
    }
  }

  // Re-enable constraints/triggers
  await targetClient.query("SET session_replication_role = 'origin';");
  console.log('Database cloning completed successfully!');

  await sourceClient.end();
  await targetClient.end();
}

cloneDatabase().catch(console.error);
