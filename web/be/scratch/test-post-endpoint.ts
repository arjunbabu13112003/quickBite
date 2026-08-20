import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OffersController } from '../src/offers/offers.controller';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const offersController = app.get(OffersController);
  
  // Simulate payload from admin panel
  const payload = {
    name: '50 off',
    description: 'Offer offer description text',
    bannerUrl: '', // Optional empty banner
    price: 0,
    offerType: 'PERCENTAGE_DISCOUNT',
    flatDiscountAmount: null,
    percentageDiscount: 50,
    maxDiscount: null,
    minimumOrder: null,
    maxDeliveryFee: null,
    deliveryRadius: null,
    appliesTo: 'items',
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 86400000).toISOString(),
    hotelIds: [1],
    isActive: true
  };

  try {
    console.log("Calling offersController.createCampaign directly...");
    const res = await offersController.createCampaign(payload);
    console.log("Success:", res);
  } catch (err) {
    console.error("Endpoint failed with error:", err);
  } finally {
    await app.close();
  }
}
bootstrap().catch(console.error);
