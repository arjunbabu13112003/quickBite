import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';
import { PushCampaignRecipient } from '../src/push-campaigns/push-campaign-recipient.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PushCampaignsService);
  const dataSource = app.get(DataSource);
  
  console.log('Bootstrapped NestJS context successfully!');

  // Reset campaign 6 and its recipients so we can retry and observe the logs
  const campaignRepo = dataSource.getRepository(PushCampaign);
  const recipientRepo = dataSource.getRepository(PushCampaignRecipient);

  await campaignRepo.update({ id: 6 }, { status: 'Failed' });
  await recipientRepo.update({ campaignId: 6, userId: 3 }, { status: 'pending', errorMessage: null });
  await recipientRepo.update({ campaignId: 6, userId: 21 }, { status: 'pending', errorMessage: null });
  console.log('Reset campaign 6 status to Failed and targeted recipients to pending.');

  try {
    const res = await service.resumeCampaign(6);
    console.log('Result:', res);
  } catch (err) {
    console.error('Error resuming campaign:', err);
  }
  
  // Wait a few seconds for the background send to run and print logs
  await new Promise(resolve => setTimeout(resolve, 8000));
  await app.close();
}

run().catch(console.error);
