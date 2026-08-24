import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { HotelNotification } from './hotel-notification.entity';
import { DeliveryPartnerNotification } from './delivery-partner-notification.entity';
import { Order } from '../orders/order.entity';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelNotification,
      DeliveryPartnerNotification,
      Order,
      DeliveryPartner,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
