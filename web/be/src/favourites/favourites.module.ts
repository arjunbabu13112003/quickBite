import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelFavourite } from './hotel-favourite.entity';
import { FoodFavourite } from './food-favourite.entity';
import { Hotel } from '../hotels/hotel.entity';
import { Food } from '../foods/food.entity';
import { FavouritesService } from './favourites.service';
import { FavouritesController } from './favourites.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelFavourite,
      FoodFavourite,
      Hotel,
      Food,
    ]),
  ],
  controllers: [FavouritesController],
  providers: [FavouritesService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
