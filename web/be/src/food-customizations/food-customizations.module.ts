import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodCustomizationGroup } from './food-customization-group.entity';
import { FoodCustomizationChoice } from './food-customization-choice.entity';
import { Food } from '../foods/food.entity';
import { FoodCustomizationsService } from './food-customizations.service';
import { FoodCustomizationsController } from './food-customizations.controller';
import { HotelAdminsModule } from '../hotel-admins/hotel-admins.module';
import { FoodsModule } from '../foods/foods.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FoodCustomizationGroup,
      FoodCustomizationChoice,
      Food,
    ]),
    HotelAdminsModule,
    FoodsModule,
  ],
  controllers: [FoodCustomizationsController],
  providers: [FoodCustomizationsService],
  exports: [FoodCustomizationsService],
})
export class FoodCustomizationsModule {}
