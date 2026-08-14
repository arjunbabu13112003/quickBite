import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Food } from './food.entity';
import { Hotel } from '../hotels/hotel.entity';
import { Category } from '../categories/category.entity';
import { HomeFoodCategory } from '../home-food-categories/home-food-category.entity';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';

@Injectable()
export class FoodsService {
  constructor(
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  async create(hotelId: number, createFoodDto: CreateFoodDto): Promise<Food> {
    // 1. Verify hotel exists and is active
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }
    if (!hotel.isActive) {
      throw new BadRequestException('Target hotel is inactive');
    }

    // 2. Verify category exists and is active
    const category = await this.categoryRepository.findOne({
      where: { id: createFoodDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createFoodDto.categoryId} not found`,
      );
    }
    if (!category.isActive) {
      throw new BadRequestException('Target category is inactive');
    }

    // 3. CRITICAL VALIDATION: category.hotelId must match food.hotelId
    if (category.hotelId !== hotelId) {
      throw new BadRequestException('Category does not belong to this hotel');
    }

    // 4. Platform Home Category validation (optional)
    if (createFoodDto.homeFoodCategoryId !== undefined && createFoodDto.homeFoodCategoryId !== null) {
      const homeCategory = await this.foodRepository.manager.getRepository(HomeFoodCategory).findOne({
        where: { id: createFoodDto.homeFoodCategoryId },
      });
      if (!homeCategory) {
        throw new NotFoundException(
          `Platform Home Category with ID ${createFoodDto.homeFoodCategoryId} not found`,
        );
      }
      if (!homeCategory.isActive) {
        throw new BadRequestException('Target Platform Home Category is inactive/deleted');
      }
    }

    if (createFoodDto.offerPrice !== undefined && createFoodDto.offerPrice !== null) {
      if (Number(createFoodDto.offerPrice) >= Number(createFoodDto.price)) {
        throw new BadRequestException('Offer price must be less than the regular price');
      }
    }

    // Sync primary image to backward-compatible image field, and array to comma-separated string
    const primaryImg = createFoodDto.images && createFoodDto.images.length > 0 ? createFoodDto.images[0] : (createFoodDto.image || null);
    const imagesArr = createFoodDto.images || (createFoodDto.image ? [createFoodDto.image] : []);
    const ingredientsStr = createFoodDto.ingredientsList ? createFoodDto.ingredientsList.join(', ') : (createFoodDto.ingredients || null);
    const ingredientsArr = createFoodDto.ingredientsList || (createFoodDto.ingredients ? createFoodDto.ingredients.split(',').map(s => s.trim()) : []);

    const food = this.foodRepository.create({
      ...createFoodDto,
      image: primaryImg,
      images: imagesArr,
      ingredients: ingredientsStr,
      ingredientsList: ingredientsArr,
      hotelId,
    });
    return await this.foodRepository.save(food);
  }

  async findAllForHotel(
    hotelId: number,
    query: {
      categoryId?: number;
      veg?: boolean;
      search?: string;
      available?: boolean;
    },
    activeOnly = true,
  ): Promise<Food[]> {
    // Verify hotel exists
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }
    if (activeOnly && !hotel.isActive) {
      return [];
    }

    const queryBuilder = this.foodRepository
      .createQueryBuilder('food')
      .leftJoinAndSelect('food.category', 'category')
      .where('food.hotelId = :hotelId', { hotelId });

    if (activeOnly) {
      queryBuilder.andWhere('food.isActive = :isActive', { isActive: true });
      queryBuilder.andWhere('category.isActive = :catActive', {
        catActive: true,
      });
    }

    if (query.categoryId) {
      queryBuilder.andWhere('food.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.veg !== undefined) {
      queryBuilder.andWhere('food.isVeg = :isVeg', { isVeg: query.veg });
    }

    if (query.available !== undefined) {
      queryBuilder.andWhere('food.isAvailable = :isAvailable', {
        isAvailable: query.available,
      });
    }

    if (query.search) {
      queryBuilder.andWhere('LOWER(food.name) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    queryBuilder
      .orderBy('food.displayOrder', 'ASC')
      .addOrderBy('food.id', 'ASC');

    const foods = await queryBuilder.getMany();

    const reviewsStats = await this.dataSource.query(`
      SELECT "foodId", AVG(rating) as average, COUNT(id) as count
      FROM food_reviews
      WHERE "isActive" = true
      GROUP BY "foodId"
    `);

    const statsMap = new Map<number, { average: number; count: number }>();
    reviewsStats.forEach((row: any) => {
      statsMap.set(Number(row.foodId), {
        average: parseFloat(parseFloat(row.average).toFixed(1)),
        count: parseInt(row.count, 10)
      });
    });

    return foods.map((food) => {
      const stats = statsMap.get(food.id);
      return {
        ...food,
        averageRating: stats ? stats.average : 0,
        ratingCount: stats ? stats.count : 0,
      };
    }) as any;
  }

  async findOne(id: number): Promise<Food> {
    const food = await this.foodRepository.findOne({
      where: { id },
      relations: [
        'category',
        'customizationGroups',
        'customizationGroups.choices',
      ],
    });
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    return food;
  }

  async update(id: number, updateFoodDto: UpdateFoodDto): Promise<Food> {
    const food = await this.findOne(id);

    // If categoryId is changing, verify category exists, is active, and belongs to same hotel
    if (
      updateFoodDto.categoryId &&
      updateFoodDto.categoryId !== food.categoryId
    ) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateFoodDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateFoodDto.categoryId} not found`,
        );
      }
      if (!category.isActive) {
        throw new BadRequestException('Target category is inactive');
      }
      if (category.hotelId !== food.hotelId) {
        throw new BadRequestException('Category does not belong to this hotel');
      }
    }

    // Platform Home Category validation (optional)
    if (updateFoodDto.homeFoodCategoryId !== undefined && updateFoodDto.homeFoodCategoryId !== null) {
      const homeCategory = await this.foodRepository.manager.getRepository(HomeFoodCategory).findOne({
        where: { id: updateFoodDto.homeFoodCategoryId },
      });
      if (!homeCategory) {
        throw new NotFoundException(
          `Platform Home Category with ID ${updateFoodDto.homeFoodCategoryId} not found`,
        );
      }
      if (!homeCategory.isActive) {
        throw new BadRequestException('Target Platform Home Category is inactive/deleted');
      }
    }

    const finalPrice = updateFoodDto.price !== undefined ? updateFoodDto.price : food.price;
    const finalOfferPrice = updateFoodDto.offerPrice !== undefined ? updateFoodDto.offerPrice : food.offerPrice;

    if (finalOfferPrice !== undefined && finalOfferPrice !== null) {
      if (Number(finalOfferPrice) >= Number(finalPrice)) {
        throw new BadRequestException('Offer price must be less than the regular price');
      }
    }

    Object.assign(food, updateFoodDto);

    // Sync updates to backward compatible columns
    if (updateFoodDto.images !== undefined) {
      food.images = updateFoodDto.images || [];
      food.image = food.images.length > 0 ? food.images[0] : null;
    } else if (updateFoodDto.image !== undefined) {
      food.image = updateFoodDto.image;
      food.images = food.image ? [food.image] : [];
    }

    if (updateFoodDto.ingredientsList !== undefined) {
      food.ingredientsList = updateFoodDto.ingredientsList || [];
      food.ingredients = food.ingredientsList.join(', ');
    } else if (updateFoodDto.ingredients !== undefined) {
      food.ingredients = updateFoodDto.ingredients;
      food.ingredientsList = food.ingredients ? food.ingredients.split(',').map(s => s.trim()) : [];
    }

    return await this.foodRepository.save(food);
  }

  async updateAvailability(id: number, isAvailable: boolean): Promise<Food> {
    const food = await this.findOne(id);
    food.isAvailable = isAvailable;
    return await this.foodRepository.save(food);
  }

  async deactivate(id: number): Promise<Food> {
    const food = await this.findOne(id);
    food.isActive = false;
    return await this.foodRepository.save(food);
  }

  async updateHomeFoodCategory(id: number, homeFoodCategoryId: number | null): Promise<Food> {
    const food = await this.foodRepository.findOne({ where: { id } });
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    if (homeFoodCategoryId !== null && homeFoodCategoryId !== undefined) {
      const categoryExists = await this.foodRepository.manager.getRepository(HomeFoodCategory).findOne({ where: { id: homeFoodCategoryId } });
      if (!categoryExists) {
        throw new NotFoundException(`Platform Home Category with ID ${homeFoodCategoryId} not found`);
      }
      if (!categoryExists.isActive) {
        throw new BadRequestException('Target Platform Home Category is inactive/deleted');
      }
    }
    food.homeFoodCategoryId = homeFoodCategoryId;
    return await this.foodRepository.save(food);
  }

  async findAllGlobal(query: {
    homeFoodCategoryId?: number;
    isActive?: boolean;
    isAvailable?: boolean;
  }): Promise<Food[]> {
    const queryBuilder = this.foodRepository
      .createQueryBuilder('food')
      .leftJoinAndSelect('food.category', 'category')
      .leftJoinAndSelect('food.hotel', 'hotel')
      .where('food.isActive = :foodActive', { foodActive: query.isActive !== false })
      .andWhere('food.isAvailable = :foodAvailable', { foodAvailable: query.isAvailable !== false })
      .andWhere('category.isActive = :catActive', { catActive: true })
      .andWhere('hotel.isActive = :hotelActive', { hotelActive: true });

    if (query.homeFoodCategoryId) {
      queryBuilder.andWhere('food.homeFoodCategoryId = :homeFoodCategoryId', {
        homeFoodCategoryId: query.homeFoodCategoryId,
      });
    }

    queryBuilder
      .orderBy('food.displayOrder', 'ASC')
      .addOrderBy('food.id', 'ASC');

    return await queryBuilder.getMany();
  }
}
