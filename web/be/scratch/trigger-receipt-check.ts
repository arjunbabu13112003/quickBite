import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PushCampaignsService } from '../src/push-campaigns/push-campaigns.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const campaignsService = app.get(PushCampaignsService);
  
  const runId = 165;
  console.log(`Manually checking receipts for Run #${runId}...`);
  const result = await campaignsService.checkRunReceiptsManually(runId);
  console.log('Check result:', result);
  
  await app.close();
}

run().catch(console.error);
