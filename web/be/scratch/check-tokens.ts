import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { DevicePushToken } from '../src/users/device-push-token.entity';
import { User } from '../src/users/user.entity';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const tokens = await dataSource.getRepository(DevicePushToken).find({
    where: { isActive: true }
  });
  
  console.log(`Found ${tokens.length} active device push tokens:`);
  for (const t of tokens) {
    const user = await dataSource.getRepository(User).findOne({ where: { id: t.userId } });
    console.log(`Token ID: ${t.id}, User ID: ${t.userId}, Name: ${user?.name}, Token: ${t.token}, AppType: ${t.appType}`);
  }
  
  await app.close();
}

run().catch(console.error);
