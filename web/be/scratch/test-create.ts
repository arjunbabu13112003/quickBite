import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OffersService } from '../src/offers/offers.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const offersService = app.get(OffersService);
  
  try {
    const res = await offersService.createCampaign({
      name: 'Test Campaign',
      description: 'Test description',
      bannerUrl: 'http://test.com/banner.png',
      price: 99,
      startAt: new Date(),
      endAt: new Date(Date.now() + 86400000),
      hotelIds: [1],
      isActive: true,
      offerType: 'PERCENTAGE_DISCOUNT',
      percentageDiscount: 50,
    });
    console.log("Success:", res);
  } catch (error) {
    console.error("Failed with error:", error);
  } finally {
    await app.close();
  }
}
bootstrap().catch(console.error);
