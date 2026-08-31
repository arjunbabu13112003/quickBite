import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function run() {
  console.log('Bootstrapping NestJS application context to initialize tables...');
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Database tables successfully synchronized and created!');
  await app.close();
}

run().catch(console.error);
