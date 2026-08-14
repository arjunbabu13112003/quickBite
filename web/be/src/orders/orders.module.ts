import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderItemCustomization } from './order-item-customization.entity';
import { Address } from '../addresses/address.entity';
import { Cart } from '../cart/cart.entity';
import { FoodCustomizationGroup } from '../food-customizations/food-customization-group.entity';
import { Hotel } from '../hotels/hotel.entity';
import { HotelAdminsModule } from '../hotel-admins/hotel-admins.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports: [
    OffersModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemCustomization,
      Address,
      Cart,
      FoodCustomizationGroup,
      Hotel,
    ]),
    HotelAdminsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
