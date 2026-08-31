import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { CreatePartnerPaymentTables1788158400000 } from '../src/migrations/1788158400000-CreatePartnerPaymentTables';
import { CreatePartnerCodRemittancesTable1788220000000 } from '../src/migrations/1788220000000-CreatePartnerCodRemittancesTable';
import { CreatePartnerPayoutAccountsTable1788230000000 } from '../src/migrations/1788230000000-CreatePartnerPayoutAccountsTable';
import { AddPartnerPayoutAccountPrimaryPartialIndex1788240000000 } from '../src/migrations/1788240000000-AddPartnerPayoutAccountPrimaryPartialIndex';

async function run() {
  console.log('Bootstrapping NestJS for migrations...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('Registering migrations in connection...');
  // Manually register migration classes in DataSource options
  Object.assign(dataSource.options, {
    migrations: [
      CreatePartnerPaymentTables1788158400000,
      CreatePartnerCodRemittancesTable1788220000000,
      CreatePartnerPayoutAccountsTable1788230000000,
      AddPartnerPayoutAccountPrimaryPartialIndex1788240000000
    ],
    migrationsRun: false,
  });

  console.log('Running pending migrations...');
  const executed = await dataSource.runMigrations();
  console.log(`Executed ${executed.length} migrations:`, executed.map(m => m.name));

  await app.close();
}

run().catch(console.error);
