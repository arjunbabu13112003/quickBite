import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodReview } from './food-review.entity';
import { Food } from '../foods/food.entity';
import { FoodReviewsService } from './food-reviews.service';
import { FoodReviewsController } from './food-reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FoodReview, Food])],
  controllers: [FoodReviewsController],
  providers: [FoodReviewsService],
  exports: [FoodReviewsService],
})
export class FoodReviewsModule {}
