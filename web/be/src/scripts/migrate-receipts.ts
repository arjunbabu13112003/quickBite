import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function runMigration() {
  console.log('=== STARTING RECEIPT TRACKING SCHEMA MIGRATION ===');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    await dataSource.transaction(async (manager) => {
      // 1. Acquire transaction-level advisory lock
      console.log('Acquiring database advisory lock...');
      await manager.query('SELECT pg_advisory_xact_lock(748294)');
      console.log('Advisory lock acquired.');

      // 2. Add columns to push_campaign_recipients
      console.log('Adding columns to push_campaign_recipients...');
      await manager.query(`
        ALTER TABLE push_campaign_recipients 
        ADD COLUMN IF NOT EXISTS "devicePushTokenId" integer DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptStatus" varchar(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptCheckedAt" timestamp with time zone DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptErrorCode" varchar(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptErrorMessage" text DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptRetryCount" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "receiptTransportRetryCount" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "receiptNextCheckAt" timestamp with time zone DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptClaimId" varchar(255) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "receiptClaimedAt" timestamp with time zone DEFAULT NULL
      `);

      // 3. Add FK constraint for devicePushTokenId
      console.log('Setting up foreign key constraint...');
      try {
        await manager.query(`
          ALTER TABLE push_campaign_recipients
          ADD CONSTRAINT "FK_recipient_device_push_token"
          FOREIGN KEY ("devicePushTokenId")
          REFERENCES device_push_tokens(id)
          ON DELETE SET NULL
        `);
        console.log('Foreign key constraint added successfully.');
      } catch (fkErr: any) {
        if (fkErr.message?.includes('already exists')) {
          console.log('Foreign key constraint already exists. Skipping.');
        } else {
          throw fkErr;
        }
      }

      // 4. Add columns to push_campaign_runs
      console.log('Adding analytics columns to push_campaign_runs...');
      await manager.query(`
        ALTER TABLE push_campaign_runs 
        ADD COLUMN IF NOT EXISTS "receiptPendingCount" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "receiptOkCount" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "receiptErrorCount" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "receiptUnavailableCount" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "invalidTokensCount" integer DEFAULT 0
      `);

      console.log('Migration committed successfully!');
    });
  } catch (error) {
    console.error('Migration failed and rolled back:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runMigration().catch((err) => {
  console.error('Migration boot failed:', err);
  process.exit(1);
});
