import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartner } from './delivery-partner.entity';
import { DeliveryAssignment } from './delivery-assignment.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { DeliveryPartnersService } from './delivery-partners.service';
import { DeliveryPartnersController } from './delivery-partners.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryPartner,
      DeliveryAssignment,
      User,
      Order,
    ]),
    PaymentsModule,
  ],
  controllers: [DeliveryPartnersController],
  providers: [DeliveryPartnersService],
  exports: [DeliveryPartnersService],
})
export class DeliveryPartnersModule {}
