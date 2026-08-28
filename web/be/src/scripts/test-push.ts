import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { DeliveryPartnersService } from '../delivery-partners/delivery-partners.service';

async function run() {
  console.log('--- Starting Notification Test Script ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const partnersService = app.get(DeliveryPartnersService);

  const userId = 16; // Rider Ajay
  const testToken = 'ExponentPushToken[0000000000000000000000]';

  // 1. Assign test token in database
  console.log(`Setting test token ${testToken} for User #${userId} in database...`);
  await dataSource.getRepository(User).update(userId, { pushToken: testToken });

  // 2. Trigger test push notification
  console.log('Triggering test push notification via DeliveryPartnersService...');
  const result = await partnersService.sendTestPushNotification(
    userId,
    'Test Alert',
    'FCM end-to-end verification push.',
    { orderId: 99, type: 'test_trigger' }
  );
  console.log('Trigger result:', result);

  // 3. Keep script running for 25 seconds to observe ticket logs and receipt logs
  console.log('Waiting 25 seconds for Expo ticket generation and receipt checks...');
  await new Promise((resolve) => setTimeout(resolve, 25000));

  console.log('--- Notification Test Script Completed ---');
  await app.close();
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
