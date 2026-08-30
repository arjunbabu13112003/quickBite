import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const campaignsService = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);

  const localImageUrl = 'http://localhost:5000/uploads/campaigns/campaign-1788113976272-828645.png';

  // Create campaign
  console.log('Creating test campaign with local image URL...');
  const campaignRepo = dataSource.getRepository(PushCampaign);
  const campaign = campaignRepo.create({
    title: 'QuickBite Admin Image Test',
    body: 'Rich notification banner test with uploaded image',
    targetAudience: 'SELECTED_CUSTOMERS',
    selectedUserIds: [37] as any, // Target User ID 37 (Achamma)
    tapAction: 'OFFERS',
    tapActionArgument: '',
    imageUrl: localImageUrl,
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
  console.log('Waiting 15 seconds for broadcast and upload to complete...');
  await new Promise((resolve) => setTimeout(resolve, 15000));

  await app.close();
}

run().catch(console.error);
