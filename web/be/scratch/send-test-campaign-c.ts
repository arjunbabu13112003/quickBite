import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const campaignsService = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);

  // Clean up any old notification image if present to make test clean
  const notificationFile = path.join(process.cwd(), 'uploads/campaigns/campaign-1788113976272-828645-notification.jpg');
  if (fs.existsSync(notificationFile)) {
    fs.unlinkSync(notificationFile);
    console.log('Cleaned up old notification file.');
  }

  const localImageUrl = 'uploads/campaigns/campaign-1788113976272-828645.png';

  console.log('Calling campaignsService.createCampaign() with oversized local image...');
  const campaign = await campaignsService.createCampaign({
    title: 'QuickBite Compressed Image Test',
    body: 'Rich notification banner test with oversized compressed image',
    targetAudience: 'SELECTED_CUSTOMERS',
    selectedUserIds: [37], // Target User ID 37 (Achamma)
    tapAction: 'OFFERS',
    tapActionArgument: '',
    imageUrl: localImageUrl,
    scheduleType: 'NOW',
  });

  console.log(`Campaign created successfully!`);
  console.log(`Campaign ID: ${campaign.id}`);
  console.log(`Stored imageUrl: ${campaign.imageUrl}`);
  console.log(`Stored notificationImageUrl: ${campaign.notificationImageUrl}`);

  if (fs.existsSync(notificationFile)) {
    const stat = fs.statSync(notificationFile);
    console.log(`Created compressed file size on disk: ${stat.size} bytes (${(stat.size / 1024).toFixed(2)} KB)`);
  } else {
    console.log('Error: compressed notification file was not created on disk!');
  }

  // Trigger campaign broadcast
  console.log(`Triggering send Campaign #${campaign.id}...`);
  const sendResult = await campaignsService.sendCampaign(campaign.id);
  console.log('Send result:', sendResult);

  // Wait 15 seconds for broadcast and fetch debug logging
  console.log('Waiting 15 seconds for broadcast tasks to complete...');
  await new Promise((resolve) => setTimeout(resolve, 15000));

  await app.close();
}

run().catch(console.error);
