import { DataSource } from 'typeorm';
import { DevicePushToken, AppType } from '../src/users/device-push-token.entity';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('=== TRANSACTIONAL RACE TEST START ===');

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
    name: `Race User ${testId}`,
    email: `race_${testId}@test.com`,
    password: 'password123',
    role: UserRole.CUSTOMER,
    mobileNumber: `9333${testId.toString().slice(-6)}`,
  });
  await userRepo.save(testUser);
  console.log('Test customer user created.');

  // Mock register token service function with try/catch to catch 23505 duplicate key exceptions
  const registerToken = async (userId: number, token: string, appType: AppType) => {
    try {
      await dataSource.transaction(async (transactionalEntityManager) => {
        // Enforce the ONE-ACTIVE-PER-APP invariant
        await transactionalEntityManager.update(
          DevicePushToken,
          { userId, appType, isActive: true },
          { isActive: false }
        );

        let deviceToken = await transactionalEntityManager.findOne(DevicePushToken, {
          where: { token }
        });

        if (deviceToken) {
          deviceToken.userId = userId;
          deviceToken.appType = appType;
          deviceToken.isActive = true;
          await transactionalEntityManager.save(DevicePushToken, deviceToken);
        } else {
          deviceToken = transactionalEntityManager.create(DevicePushToken, {
            userId,
            token,
            appType,
            isActive: true,
          });
          await transactionalEntityManager.save(DevicePushToken, deviceToken);
        }
      });
      return { success: true, message: 'Push token registered successfully' };
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('UQ_active_user_app_token') || err.message?.includes('device_push_tokens')) {
        console.log('[MOCK SERVICE] Caught concurrent race condition. Returning idempotent success.');
        return { success: true, message: 'Push token registered successfully (idempotent)' };
      }
      throw err;
    }
  };

  // RACE TEST 1: Register EXACTLY SAME token concurrently
  console.log('\n--- RACE TEST 1: SAME TOKEN CONCURRENT REGISTRATION ---');
  const resultsSame = await Promise.all([
    registerToken(testUser.id, 'ExponentPushToken[SameToken]', AppType.CUSTOMER),
    registerToken(testUser.id, 'ExponentPushToken[SameToken]', AppType.CUSTOMER)
  ]);

  console.log('Registration 1 result:', resultsSame[0]);
  console.log('Registration 2 result:', resultsSame[1]);

  const activeSameTokens = await tokenRepo.find({
    where: { userId: testUser.id, appType: AppType.CUSTOMER, isActive: true }
  });
  console.log(`Active tokens in DB: ${activeSameTokens.length}`);

  if (resultsSame[0].success && resultsSame[1].success && activeSameTokens.length === 1) {
    console.log('RACE TEST 1 RESULT: PASS');
  } else {
    console.log('RACE TEST 1 RESULT: FAIL');
  }

  // Clear before test 2
  await tokenRepo.delete({ userId: testUser.id });

  // RACE TEST 2: Register TWO DIFFERENT tokens concurrently
  console.log('\n--- RACE TEST 2: DIFFERENT TOKENS CONCURRENT REGISTRATION ---');
  const resultsDiff = await Promise.all([
    registerToken(testUser.id, 'ExponentPushToken[TokenA]', AppType.CUSTOMER),
    registerToken(testUser.id, 'ExponentPushToken[TokenB]', AppType.CUSTOMER)
  ]);

  console.log('Registration A result:', resultsDiff[0]);
  console.log('Registration B result:', resultsDiff[1]);

  const activeDiffTokens = await tokenRepo.find({
    where: { userId: testUser.id, appType: AppType.CUSTOMER, isActive: true }
  });
  console.log(`Active tokens in DB: ${activeDiffTokens.length}`);

  if (resultsDiff[0].success && resultsDiff[1].success && activeDiffTokens.length === 1) {
    console.log('RACE TEST 2 RESULT: PASS');
  } else {
    console.log('RACE TEST 2 RESULT: FAIL');
  }

  // Clean up
  await tokenRepo.delete({ userId: testUser.id });
  await userRepo.delete({ id: testUser.id });
  await dataSource.destroy();
  console.log('\n=== TRANSACTIONAL RACE TEST COMPLETE ===');
}

run().catch(console.error);
