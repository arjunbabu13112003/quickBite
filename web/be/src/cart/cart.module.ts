import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { CartItemCustomizationChoice } from './cart-item-customization-choice.entity';
import { Food } from '../foods/food.entity';
import { FoodCustomizationChoice } from '../food-customizations/food-customization-choice.entity';
import { FoodCustomizationGroup } from '../food-customizations/food-customization-group.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      CartItemCustomizationChoice,
      Food,
      FoodCustomizationChoice,
      FoodCustomizationGroup,
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
