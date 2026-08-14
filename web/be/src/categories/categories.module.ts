import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Hotel } from '../hotels/hotel.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { HotelAdminsModule } from '../hotel-admins/hotel-admins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Hotel]),
    HotelAdminsModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
