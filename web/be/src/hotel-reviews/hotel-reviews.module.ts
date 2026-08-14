import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelReview } from './hotel-review.entity';
import { Hotel } from '../hotels/hotel.entity';
import { HotelReviewsService } from './hotel-reviews.service';
import { HotelReviewsController } from './hotel-reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HotelReview, Hotel])],
  controllers: [HotelReviewsController],
  providers: [HotelReviewsService],
  exports: [HotelReviewsService],
})
export class HotelReviewsModule {}
