import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { HotelsModule } from './hotels/hotels.module';
import { HotelAdminsModule } from './hotel-admins/hotel-admins.module';
import { CategoriesModule } from './categories/categories.module';
import { FoodsModule } from './foods/foods.module';
import { FoodCustomizationsModule } from './food-customizations/food-customizations.module';
import { FavouritesModule } from './favourites/favourites.module';
import { HotelReviewsModule } from './hotel-reviews/hotel-reviews.module';
import { FoodReviewsModule } from './food-reviews/food-reviews.module';
import { CartModule } from './cart/cart.module';
import { AddressesModule } from './addresses/addresses.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryPartnersModule } from './delivery-partners/delivery-partners.module';
import { PaymentsModule } from './payments/payments.module';
import { validate } from './config/env.validation';
import { NotificationsModule } from './notifications/notifications.module';
import { HomeFoodCategoriesModule } from './home-food-categories/home-food-categories.module';
import { OffersModule } from './offers/offers.module';
import { AppController } from './app.controller';
import { BrandingModule } from './branding/branding.module';
import { PushCampaignsModule } from './push-campaigns/push-campaigns.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('DB_HOST'),

        port: Number(configService.get<string>('DB_PORT')),

        username: configService.get<string>('DB_USERNAME'),

        password: configService.get<string>('DB_PASSWORD'),

        database: configService.get<string>('DB_DATABASE'),

        autoLoadEntities: true,

        synchronize: true,
        logging: true,
      }),
    }),

    UsersModule,
    HotelsModule,
    HotelAdminsModule,
    CategoriesModule,
    FoodsModule,
    FoodCustomizationsModule,
    FavouritesModule,
    HotelReviewsModule,
    FoodReviewsModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    DeliveryPartnersModule,
    PaymentsModule,
    NotificationsModule,
    HomeFoodCategoriesModule,
    OffersModule,
    BrandingModule,
    PushCampaignsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        const fs = require('fs');
        const logPath = 'C:\\Users\\arjun\\.gemini\\antigravity-ide\\brain\\a0ff31c6-b252-4fa3-b2f6-08b2dcd8c6bf\\order_track_debug.log';
        let logMsg = `[REQUEST] ${new Date().toISOString()} ${req.method} ${req.originalUrl}\n`;
        logMsg += `Headers: ${JSON.stringify(req.headers)}\n`;
        res.on('finish', () => {
          logMsg += `[RESPONSE] Status: ${res.statusCode}\n\n`;
          fs.appendFileSync(logPath, logMsg);
        });
        next();
      })
      .forRoutes('*');
  }
}