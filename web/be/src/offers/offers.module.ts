import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './offer.entity';
import { OfferRedemption } from './offer-redemption.entity';
import { Category } from '../categories/category.entity';
import { Food } from '../foods/food.entity';
import { Hotel } from '../hotels/hotel.entity';
import { HotelAdmin } from '../hotel-admins/hotel-admin.entity';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Offer,
      OfferRedemption,
      Category,
      Food,
      Hotel,
      HotelAdmin,
    ]),
  ],
  providers: [OffersService],
  controllers: [OffersController],
  exports: [OffersService],
})
export class OffersModule {}
