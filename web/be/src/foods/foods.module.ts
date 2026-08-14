import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Food } from './food.entity';
import { Hotel } from '../hotels/hotel.entity';
import { Category } from '../categories/category.entity';
import { FoodsService } from './foods.service';
import { FoodsController } from './foods.controller';
import { HotelAdminsModule } from '../hotel-admins/hotel-admins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Food, Hotel, Category]),
    HotelAdminsModule,
  ],
  controllers: [FoodsController],
  providers: [FoodsService],
  exports: [FoodsService],
})
export class FoodsModule {}
