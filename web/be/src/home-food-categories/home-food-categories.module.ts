import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeFoodCategoriesController } from './home-food-categories.controller';
import { HomeFoodCategoriesService } from './home-food-categories.service';
import { HomeFoodCategory } from './home-food-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HomeFoodCategory])],
  controllers: [HomeFoodCategoriesController],
  providers: [HomeFoodCategoriesService],
  exports: [HomeFoodCategoriesService],
})
export class HomeFoodCategoriesModule {}
