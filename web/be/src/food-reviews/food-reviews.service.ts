import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodReview } from './food-review.entity';
import { Food } from '../foods/food.entity';

@Injectable()
export class FoodReviewsService {
  constructor(
    @InjectRepository(FoodReview)
    private readonly reviewRepository: Repository<FoodReview>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
  ) {}

  async create(
    userId: number,
    foodId: number,
    dto: { rating: number; review?: string },
  ): Promise<FoodReview> {
    // 1. Verify active food, hotel, and category
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

    const existing = await this.reviewRepository.findOne({
      where: { userId, foodId },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('You have already reviewed this food');
      } else {
        // Reactivate soft-deleted review
        existing.isActive = true;
        existing.rating = dto.rating;
        existing.review = dto.review;
        return await this.reviewRepository.save(existing);
      }
    }

    const review = this.reviewRepository.create({
      userId,
      foodId,
      rating: dto.rating,
      review: dto.review,
      isActive: true,
    });

    return await this.reviewRepository.save(review);
  }

  async getReviewsForFood(
    foodId: number,
    sort: string = 'newest',
  ): Promise<FoodReview[]> {
    const food = await this.foodRepository.findOne({
      where: { id: foodId },
      relations: ['hotel', 'category'],
    });
    if (
      !food ||
      !food.isActive ||
      !food.hotel?.isActive ||
      !food.category?.isActive
    ) {
      throw new NotFoundException(
        `Food with ID ${foodId} not found or is inactive`,
      );
    }

    const order: any = {};
    if (sort === 'oldest') {
      order.createdAt = 'ASC';
    } else if (sort === 'highest') {
      order.rating = 'DESC';
      order.createdAt = 'DESC';
    } else if (sort === 'lowest') {
      order.rating = 'ASC';
      order.createdAt = 'DESC';
    } else {
      order.createdAt = 'DESC'; // newest
    }

    return await this.reviewRepository.find({
      where: { foodId, isActive: true },
      relations: ['user'],
      select: {
        id: true,
        rating: true,
        review: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          name: true,
        },
      },
      order,
    });
  }

  async getRatingSummary(foodId: number) {
    const food = await this.foodRepository.findOne({
      where: { id: foodId },
      relations: ['hotel', 'category'],
    });
    if (
      !food ||
      !food.isActive ||
      !food.hotel?.isActive ||
      !food.category?.isActive
    ) {
      throw new NotFoundException(
        `Food with ID ${foodId} not found or is inactive`,
      );
    }

    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.foodId = :foodId', { foodId })
      .andWhere('review.isActive = :isActive', { isActive: true })
      .getRawOne();

    const distributionRaw = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.foodId = :foodId', { foodId })
      .andWhere('review.isActive = :isActive', { isActive: true })
      .groupBy('review.rating')
      .getRawMany();

    const ratingCount = parseInt(stats.count, 10) || 0;
    const averageRating =
      ratingCount > 0
        ? parseFloat(parseFloat(stats.average).toFixed(1))
        : 0;

    const distribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    distributionRaw.forEach((row) => {
      const ratingKey = String(row.rating);
      if (ratingKey in distribution) {
        distribution[ratingKey] = parseInt(row.count, 10);
      }
    });

    return {
      averageRating,
      ratingCount,
      distribution,
    };
  }

  async getReviewMe(userId: number, foodId: number): Promise<FoodReview> {
    const review = await this.reviewRepository.findOne({
      where: { userId, foodId, isActive: true },
    });
    if (!review) {
      throw new NotFoundException('You have no active review for this food');
    }
    return review;
  }

  async updateReview(
    userId: number,
    foodId: number,
    dto: { rating?: number; review?: string },
  ): Promise<FoodReview> {
    if (dto.rating === undefined && dto.review === undefined) {
      throw new BadRequestException('No fields to update provided');
    }

    const review = await this.reviewRepository.findOne({
      where: { userId, foodId, isActive: true },
    });
    if (!review) {
      throw new NotFoundException('You have no active review for this food');
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }
    if (dto.review !== undefined) {
      review.review = dto.review;
    }

    return await this.reviewRepository.save(review);
  }

  async deactivateReview(userId: number, foodId: number) {
    const review = await this.reviewRepository.findOne({
      where: { userId, foodId, isActive: true },
    });
    if (!review) {
      throw new NotFoundException('You have no active review for this food');
    }

    review.isActive = false;
    await this.reviewRepository.save(review);

    return {
      message: 'Review deleted successfully',
      isActive: false,
    };
  }
}
