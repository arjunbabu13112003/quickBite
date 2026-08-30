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

  // Create a new campaign targeted ONLY to user ID 21 (Test Customer) with action OFFERS
  const campaignRepo = dataSource.getRepository(PushCampaign);
  
  const campaign = campaignRepo.create({
    title: 'Hot Pizza Deals!',
    body: 'Grab your 50% discount on all Pizzas 🍕',
    targetAudience: 'SELECTED_CUSTOMERS',
    selectedUserIds: [21],
    tapAction: 'OFFERS',
    status: 'Draft',
  });
  
  const savedCampaign = await campaignRepo.save(campaign);
  console.log(`Created new OFFERS test campaign ID: ${savedCampaign.id}`);

  try {
    const res = await service.sendCampaign(savedCampaign.id);
    console.log('Send campaign result:', res);
  } catch (err) {
    console.error('Error sending campaign:', err);
  }
  
  // Wait a few seconds for the background send to run and print logs
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Query final stats
  const updatedCampaign = await campaignRepo.findOne({ where: { id: savedCampaign.id } });
  console.log('--- FINAL CAMPAIGN STATS ---');
  console.log(updatedCampaign);

  await app.close();
}

run().catch(console.error);
