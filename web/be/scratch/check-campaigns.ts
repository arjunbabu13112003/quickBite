import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const campaigns = await dataSource.getRepository(PushCampaign).find({
    order: { id: 'DESC' },
    take: 5
  });
  
  console.log(`Latest 5 campaigns in DB:`);
  for (const c of campaigns) {
    console.log(`-----------------------------------------`);
    console.log(`ID: ${c.id}`);
    console.log(`Title: ${c.title}`);
    console.log(`Body: ${c.body}`);
    console.log(`Status: ${c.status}`);
    console.log(`Target Audience: ${c.targetAudience}`);
    console.log(`imageUrl: ${c.imageUrl}`);
    console.log(`createdAt: ${c.createdAt}`);
  }
  
  await app.close();
}

run().catch(console.error);
