import { Client } from 'pg';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function countOrders(dbName: string) {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'arjun@@12345',
    database: dbName,
  });
  await client.connect();
  const res = await client.query('SELECT count(*) FROM orders');
  await client.end();
  return parseInt(res.rows[0].count, 10);
}

async function run() {
  console.log('Before booting NestJS, orders count in test DB:', await countOrders('food_ordering_test'));
  
  console.log('Booting NestJS AppModule...');
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('NestJS AppModule booted successfully.');
  
  console.log('After booting NestJS, orders count in test DB:', await countOrders('food_ordering_test'));
  await app.close();
}

run().catch(console.error);
