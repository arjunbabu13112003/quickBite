import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelReview } from './hotel-review.entity';
import { Hotel } from '../hotels/hotel.entity';

@Injectable()
export class HotelReviewsService {
  constructor(
    @InjectRepository(HotelReview)
    private readonly reviewRepository: Repository<HotelReview>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
  ) {}

  async create(
    userId: number,
    hotelId: number,
    dto: { rating: number; review?: string },
  ): Promise<HotelReview> {
    const hotel = await this.hotelRepository.findOne({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }
    if (!hotel.isActive) {
      throw new BadRequestException('Hotel is inactive');
    }

    const existing = await this.reviewRepository.findOne({
      where: { userId, hotelId },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('You have already reviewed this hotel');
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
      hotelId,
      rating: dto.rating,
      review: dto.review,
      isActive: true,
    });

    return await this.reviewRepository.save(review);
  }

  async getReviewsForHotel(
    hotelId: number,
    sort: string = 'newest',
  ): Promise<HotelReview[]> {
    const hotel = await this.hotelRepository.findOne({
      where: { id: hotelId },
    });
    if (!hotel || !hotel.isActive) {
      throw new NotFoundException(
        `Hotel with ID ${hotelId} not found or is inactive`,
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
      where: { hotelId, isActive: true },
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

  async getRatingSummary(hotelId: number) {
    const hotel = await this.hotelRepository.findOne({
      where: { id: hotelId },
    });
    if (!hotel || !hotel.isActive) {
      throw new NotFoundException(
        `Hotel with ID ${hotelId} not found or is inactive`,
      );
    }

    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.hotelId = :hotelId', { hotelId })
      .andWhere('review.isActive = :isActive', { isActive: true })
      .getRawOne();

    const distributionRaw = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.hotelId = :hotelId', { hotelId })
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

  async getReviewMe(userId: number, hotelId: number): Promise<HotelReview> {
    const review = await this.reviewRepository.findOne({
      where: { userId, hotelId, isActive: true },
    });
    if (!review) {
      throw new NotFoundException('You have no active review for this hotel');
    }
    return review;
  }

  async updateReview(
    userId: number,
    hotelId: number,
    dto: { rating?: number; review?: string },
  ): Promise<HotelReview> {
    if (dto.rating === undefined && dto.review === undefined) {
      throw new BadRequestException('No fields to update provided');
    }

    const review = await this.reviewRepository.findOne({
      where: { userId, hotelId, isActive: true },
    });
    if (!review) {
      throw new NotFoundException('You have no active review for this hotel');
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }
    if (dto.review !== undefined) {
      review.review = dto.review;
    }

    return await this.reviewRepository.save(review);
  }

  async deactivateReview(userId: number, hotelId: number) {
    const review = await this.reviewRepository.findOne({
      where: { userId, hotelId, isActive: true },
    });
    if (!review) {
      throw new NotFoundException('You have no active review for this hotel');
    }

    review.isActive = false;
    await this.reviewRepository.save(review);

    return {
      message: 'Review deleted successfully',
      isActive: false,
    };
  }
}
