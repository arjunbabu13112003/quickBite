import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './offer.entity';
import { OfferRedemption } from './offer-redemption.entity';
import { Store99Campaign } from './store99-campaign.entity';
import { Store99Item } from './store99-item.entity';
import { HotelCampaignParticipation } from './hotel-campaign-participation.entity';
import { Category } from '../categories/category.entity';
import { Food } from '../foods/food.entity';
import { Hotel } from '../hotels/hotel.entity';
import { HotelAdmin } from '../hotel-admins/hotel-admin.entity';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Offer,
      OfferRedemption,
      Category,
      Food,
      Hotel,
      HotelAdmin,
      Store99Campaign,
      Store99Item,
      HotelCampaignParticipation,
    ]),
    NotificationsModule,
  ],
  providers: [OffersService],
  controllers: [OffersController],
  exports: [OffersService],
})
export class OffersModule {}
