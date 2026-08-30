import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';
import fetch from 'node-fetch';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const campaignsService = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);

  const imageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop';
  
  console.log(`Checking if image URL is reachable: ${imageUrl}`);
  try {
    const res = await fetch(imageUrl, { method: 'HEAD' });
    console.log(`Image URL check status: ${res.status} (${res.statusText})`);
    if (res.ok) {
      console.log(`Image URL reachable from device: YES`);
    } else {
      console.log(`Image URL reachable from device: NO`);
    }
  } catch (err) {
    console.error(`Failed to reach image URL:`, err);
    console.log(`Image URL reachable from device: NO`);
  }

  // Create campaign
  console.log('Creating test campaign...');
  const campaignRepo = dataSource.getRepository(PushCampaign);
  const campaign = campaignRepo.create({
    title: 'QuickBite Image Test',
    body: 'Rich notification banner test',
    targetAudience: 'SELECTED_CUSTOMERS',
    selectedUserIds: [37] as any, // Target User ID 37 (Achamma)
    tapAction: 'OFFERS',
    tapActionArgument: '',
    imageUrl: imageUrl,
    scheduleType: 'NOW',
    status: 'Draft',
  });
  const savedCampaign = await campaignRepo.save(campaign);
  console.log(`Saved campaign ID: ${savedCampaign.id}`);

  // Send campaign
  console.log(`Sending campaign ID: ${savedCampaign.id}...`);
  const sendResult = await campaignsService.sendCampaign(savedCampaign.id);
  console.log('Send result:', sendResult);

  // Wait a few seconds to let background broadcast work
  console.log('Waiting 15 seconds for broadcast to complete...');
  await new Promise((resolve) => setTimeout(resolve, 15000));

  await app.close();
}

run().catch(console.error);
