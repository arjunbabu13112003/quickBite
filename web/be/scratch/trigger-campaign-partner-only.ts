import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);
  
  console.log('Bootstrapped NestJS context successfully!');

  // Create a new campaign targeted ONLY to user ID 3 (kannan, who has ONLY a DELIVERY_PARTNER token)
  const campaignRepo = dataSource.getRepository(PushCampaign);
  
  const campaign = campaignRepo.create({
    title: 'Customer Promo to Partner Token User',
    body: 'This should not deliver to partner app 🍔',
    targetAudience: 'SELECTED_CUSTOMERS',
    selectedUserIds: [3],
    tapAction: 'HOME',
    status: 'Draft',
  });
  
  const savedCampaign = await campaignRepo.save(campaign);
  console.log(`Created new campaign ID: ${savedCampaign.id}`);

  try {
    const res = await service.sendCampaign(savedCampaign.id);
    console.log('Send campaign result:', res);
  } catch (err) {
    console.error('Error sending campaign:', err);
  }
  
  // Wait a few seconds for the background send to run
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Query final stats
  const updatedCampaign = await campaignRepo.findOne({ where: { id: savedCampaign.id } });
  console.log('--- FINAL CAMPAIGN STATS ---');
  console.log(updatedCampaign);

  await app.close();
}

run().catch(console.error);
