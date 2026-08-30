import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function runMigration() {
  console.log('=== STARTING PUSH RUNS DATA MIGRATION ===');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    await dataSource.transaction(async (manager) => {
      // 1. Acquire transaction-level advisory lock
      console.log('Acquiring transaction-level database advisory lock...');
      await manager.query('SELECT pg_advisory_xact_lock(748293)');
      console.log('Advisory lock acquired successfully.');

      // 2. Load all campaigns
      const campaigns = await manager.query('SELECT * FROM push_campaigns');
      console.log(`Loaded ${campaigns.length} push campaigns to evaluate.`);

      for (const campaign of campaigns) {
        // Check if a run already exists for this campaign
        const existingRuns = await manager.query(
          'SELECT id FROM push_campaign_runs WHERE "campaignId" = $1 LIMIT 1',
          [campaign.id]
        );

        if (existingRuns.length === 0) {
          console.log(`Migrating campaign #${campaign.id} ("${campaign.title}"):`);
          
          const scheduledFor = campaign.scheduledAt || campaign.sentAt || campaign.createdAt;
          const stats = campaign.stats || {};
          
          let runStatus = 'Scheduled';
          if (campaign.status === 'Sent') runStatus = 'Sent';
          else if (campaign.status === 'Failed') runStatus = 'Failed';
          else if (campaign.status === 'Sending') runStatus = 'Sending';

          // Insert PushCampaignRun record
          const runResult = await manager.query(
            `INSERT INTO push_campaign_runs 
             ("campaignId", "scheduledFor", "startedAt", "completedAt", "status", 
              "targetedCount", "submittedCount", "failedCount", "noTokenCount", "unknownCount", 
              "triggerType", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id`,
            [
              campaign.id,
              scheduledFor,
              campaign.sendingStartedAt || null,
              campaign.sentAt || null,
              runStatus,
              stats.targetedCount || 0,
              stats.submittedCount || 0,
              stats.failedCount || 0,
              stats.noTokenCount || 0,
              stats.unknownCount || 0,
              campaign.scheduleType === 'NOW' ? 'MANUAL' : 'SCHEDULED',
              campaign.createdAt
            ]
          );

          const runId = runResult[0].id;
          console.log(`  -> Created run #${runId} with status "${runStatus}"`);

          // Backfill push_campaign_recipients table
          const recipientUpdate = await manager.query(
            'UPDATE push_campaign_recipients SET "runId" = $1 WHERE "campaignId" = $2 AND "runId" IS NULL',
            [runId, campaign.id]
          );
          console.log(`  -> Associated ${recipientUpdate[1] || 0} recipient rows`);

          // Backfill customer_notifications table
          const notificationUpdate = await manager.query(
            'UPDATE customer_notifications SET "runId" = $1 WHERE "campaignId" = $2 AND "runId" IS NULL',
            [runId, campaign.id]
          );
          console.log(`  -> Associated ${notificationUpdate[1] || 0} customer inbox rows`);
        } else {
          console.log(`Campaign #${campaign.id} ("${campaign.title}") already has runs. Skipping.`);
        }
      }
      
      console.log('Checking for remaining orphaned records...');
      // Ensure all recipients and customer notifications are backfilled
      const orphanedRecipients = await manager.query('SELECT COUNT(*) FROM push_campaign_recipients WHERE "runId" IS NULL');
      const orphanedNotifications = await manager.query('SELECT COUNT(*) FROM customer_notifications WHERE "runId" IS NULL');
      console.log(`Orphaned recipients remaining: ${orphanedRecipients[0].count}`);
      console.log(`Orphaned notifications remaining: ${orphanedNotifications[0].count}`);

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
