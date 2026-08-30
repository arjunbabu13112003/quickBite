import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { HotelNotification } from './hotel-notification.entity';
import { DeliveryPartnerNotification } from './delivery-partner-notification.entity';
import { CustomerNotification } from './customer-notification.entity';
import { Order } from '../orders/order.entity';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';
import { User } from '../users/user.entity';
import { DevicePushToken } from '../users/device-push-token.entity';
import { HotelAdminsModule } from '../hotel-admins/hotel-admins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelNotification,
      DeliveryPartnerNotification,
      CustomerNotification,
      Order,
      DeliveryPartner,
      User,
      DevicePushToken,
    ]),
    HotelAdminsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
