import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { PushCampaignRecipient } from '../src/push-campaigns/push-campaign-recipient.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const recipient = await dataSource.getRepository(PushCampaignRecipient).findOne({
    where: { expoTicketId: '01a053e1-ff79-74f3-a13c-329efbeb6598' }
  });
  
  console.log(`Recipient Status:`);
  console.log(`ID: ${recipient?.id}`);
  console.log(`User ID: ${recipient?.userId}`);
  console.log(`Ticket ID: ${recipient?.expoTicketId}`);
  console.log(`Send Status: ${recipient?.status}`);
  console.log(`Receipt Status: ${recipient?.receiptStatus}`);
  console.log(`Error Message: ${recipient?.receiptErrorMessage || 'None'}`);
  
  await app.close();
}

run().catch(console.error);
