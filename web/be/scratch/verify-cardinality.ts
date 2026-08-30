import { DataSource } from 'typeorm';
import { DevicePushToken, AppType } from '../src/users/device-push-token.entity';
import { User } from '../src/users/user.entity';
import { Order } from '../src/orders/order.entity';
import { Address } from '../src/addresses/address.entity';
import { DeliveryPartner } from '../src/delivery-partners/delivery-partner.entity';
import { Hotel } from '../src/hotels/hotel.entity';
import { CustomerNotification } from '../src/notifications/customer-notification.entity';
import { PushCampaign } from '../src/push-campaigns/push-campaign.entity';
import { PushCampaignRecipient } from '../src/push-campaigns/push-campaign-recipient.entity';
import { UserRole } from '../src/users/user-role.enum';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('=== CARDINALITY AND LIFECYCLE TESTS START ===');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5000,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'quickbite',
    entities: [__dirname + '/../src/**/*.entity.ts', __dirname + '/../src/**/*.entity.js'],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('Connected to PG Database!');

  const userRepo = dataSource.getRepository(User);
  const tokenRepo = dataSource.getRepository(DevicePushToken);

  const testId = Date.now();
  const testUser = userRepo.create({
    name: `Lifecycle User ${testId}`,
    email: `life_${testId}@test.com`,
    password: 'password123',
    role: UserRole.CUSTOMER,
    mobileNumber: `9111${testId.toString().slice(-6)}`,
  });
  await userRepo.save(testUser);
  console.log('Test user created.');

  // Helper mock register function matching service
  const registerToken = async (userId: number, token: string, appType: AppType) => {
    // Enforce invariant
    await tokenRepo.update(
      { userId, appType, isActive: true },
      { isActive: false }
    );

    let deviceToken = await tokenRepo.findOne({ where: { token } });
    if (deviceToken) {
      deviceToken.userId = userId;
      deviceToken.appType = appType;
      deviceToken.isActive = true;
      await tokenRepo.save(deviceToken);
    } else {
      deviceToken = tokenRepo.create({
        userId,
        token,
        appType,
        isActive: true,
      });
      await tokenRepo.save(deviceToken);
    }
  };

  // TEST A: Register Token A
  await registerToken(testUser.id, 'ExponentPushToken[TokenA]', AppType.CUSTOMER);
  let activeTokens = await tokenRepo.find({ where: { userId: testUser.id, appType: AppType.CUSTOMER, isActive: true } });
  if (activeTokens.length === 1 && activeTokens[0].token === 'ExponentPushToken[TokenA]') {
    console.log('TEST A Part 1 PASS: Token A registered as only active CUSTOMER token.');
  } else {
    console.log('TEST A Part 1 FAIL: Registration failed.');
  }

  // Register Token B for same user
  await registerToken(testUser.id, 'ExponentPushToken[TokenB]', AppType.CUSTOMER);
  activeTokens = await tokenRepo.find({ where: { userId: testUser.id, appType: AppType.CUSTOMER, isActive: true } });
  const allTokens = await tokenRepo.find({ where: { userId: testUser.id, appType: AppType.CUSTOMER } });
  
  if (activeTokens.length === 1 && activeTokens[0].token === 'ExponentPushToken[TokenB]' && allTokens.length === 2) {
    const inactiveToken = allTokens.find(t => t.token === 'ExponentPushToken[TokenA]');
    if (inactiveToken && !inactiveToken.isActive) {
      console.log('TEST A Part 2 PASS: Token A deactivated, Token B active. Exactly one active CUSTOMER token.');
    } else {
      console.log('TEST A Part 2 FAIL: Token A not deactivated.');
    }
  } else {
    console.log('TEST A Part 2 FAIL: Invariant enforcement failed.');
  }

  // TEST B: Register Partner Token
  await registerToken(testUser.id, 'ExponentPushToken[PartnerToken]', AppType.DELIVERY_PARTNER);
  const activePartnerTokens = await tokenRepo.find({ where: { userId: testUser.id, appType: AppType.DELIVERY_PARTNER, isActive: true } });
  activeTokens = await tokenRepo.find({ where: { userId: testUser.id, appType: AppType.CUSTOMER, isActive: true } });

  if (activePartnerTokens.length === 1 && activePartnerTokens[0].token === 'ExponentPushToken[PartnerToken]') {
    if (activeTokens.length === 1 && activeTokens[0].token === 'ExponentPushToken[TokenB]') {
      console.log('TEST B PASS: Partner token registered separately, CUSTOMER token remains active and untouched.');
    } else {
      console.log('TEST B FAIL: CUSTOMER token contaminated.');
    }
  } else {
    console.log('TEST B FAIL: Partner token registration failed.');
  }

  // Clean up
  await tokenRepo.delete({ userId: testUser.id });
  await userRepo.delete({ id: testUser.id });
  await dataSource.destroy();
  console.log('=== ALL LIFECYCLE TESTS COMPLETE ===');
}

run().catch(console.error);
