import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelFavourite } from './hotel-favourite.entity';
import { FoodFavourite } from './food-favourite.entity';
import { Hotel } from '../hotels/hotel.entity';
import { Food } from '../foods/food.entity';

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(HotelFavourite)
    private readonly hotelFavouriteRepository: Repository<HotelFavourite>,
    @InjectRepository(FoodFavourite)
    private readonly foodFavouriteRepository: Repository<FoodFavourite>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
  ) {}

  // --- HOTEL FAVOURITES ---

  async addHotelFavourite(userId: number, hotelId: number) {
    const hotel = await this.hotelRepository.findOne({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }
    if (!hotel.isActive) {
      throw new BadRequestException('Hotel is inactive');
    }

    // Idempotency check
    const existing = await this.hotelFavouriteRepository.findOne({
      where: { userId, hotelId },
    });
    if (existing) {
      return {
        message: 'Hotel already in favourites',
        isFavourite: true,
      };
    }

    const newFav = this.hotelFavouriteRepository.create({ userId, hotelId });
    await this.hotelFavouriteRepository.save(newFav);

    return {
      message: 'Hotel added to favourites',
      isFavourite: true,
    };
  }

  async removeHotelFavourite(userId: number, hotelId: number) {
    const existing = await this.hotelFavouriteRepository.findOne({
      where: { userId, hotelId },
    });
    if (existing) {
      await this.hotelFavouriteRepository.remove(existing);
    }
    return {
      message: 'Hotel removed from favourites',
      isFavourite: false,
    };
  }

  async getHotelFavourites(userId: number) {
    const favs = await this.hotelFavouriteRepository.find({
      where: { userId },
      relations: ['hotel'],
    });

    // Return only active hotels
    return favs
      .filter((f) => f.hotel && f.hotel.isActive === true)
      .map((f) => {
        const { gstNumber: _, fssaiNumber: __, ...hotelPublic } = f.hotel;
        return hotelPublic;
      });
  }

  async getHotelFavouriteStatus(userId: number, hotelId: number) {
    const existing = await this.hotelFavouriteRepository.findOne({
      where: { userId, hotelId },
    });
    return {
      isFavourite: !!existing,
    };
  }

  // --- FOOD FAVOURITES ---

  async addFoodFavourite(userId: number, foodId: number) {
    const food = await this.foodRepository.findOne({
      where: { id: foodId },
      relations: ['hotel', 'category'],
    });

    if (!food || !food.isActive) {
      throw new NotFoundException(`Food with ID ${foodId} not found or is inactive`);
    }
    if (!food.hotel || !food.hotel.isActive) {
      throw new BadRequestException('Hotel associated with this food is inactive');
    }
    if (!food.category || !food.category.isActive) {
      throw new BadRequestException('Category associated with this food is inactive');
    }

    // Idempotency check
    const existing = await this.foodFavouriteRepository.findOne({
      where: { userId, foodId },
    });
    if (existing) {
      return {
        message: 'Food already in favourites',
        isFavourite: true,
      };
    }

    const newFav = this.foodFavouriteRepository.create({ userId, foodId });
    await this.foodFavouriteRepository.save(newFav);

    return {
      message: 'Food added to favourites',
      isFavourite: true,
    };
  }

  async removeFoodFavourite(userId: number, foodId: number) {
    const existing = await this.foodFavouriteRepository.findOne({
      where: { userId, foodId },
    });
    if (existing) {
      await this.foodFavouriteRepository.remove(existing);
    }
    return {
      message: 'Food removed from favourites',
      isFavourite: false,
    };
  }

  async getFoodFavourites(userId: number) {
    const favs = await this.foodFavouriteRepository.find({
      where: { userId },
      relations: ['food', 'food.hotel', 'food.category'],
    });

    // Return only active food, active hotel, and active category
    return favs
      .filter(
        (f) =>
          f.food &&
          f.food.isActive === true &&
          f.food.hotel &&
          f.food.hotel.isActive === true &&
          f.food.category &&
          f.food.category.isActive === true,
      )
      .map((f) => {
        const { gstNumber: _, fssaiNumber: __, ...hotelPublic } = f.food.hotel;
        return {
          id: f.food.id,
          hotelId: f.food.hotelId,
          categoryId: f.food.categoryId,
          name: f.food.name,
          description: f.food.description,
          ingredients: f.food.ingredients,
          image: f.food.image,
          price: f.food.price,
          isVeg: f.food.isVeg,
          isAvailable: f.food.isAvailable,
          isBestseller: f.food.isBestseller,
          calories: f.food.calories,
          preparationTime: f.food.preparationTime,
          hotel: {
            id: hotelPublic.id,
            name: hotelPublic.name,
          },
        };
      });
  }

  async getFoodFavouriteStatus(userId: number, foodId: number) {
    const existing = await this.foodFavouriteRepository.findOne({
      where: { userId, foodId },
    });
    return {
      isFavourite: !!existing,
    };
  }
}
