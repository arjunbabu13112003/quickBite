import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { Hotel } from '../hotels/hotel.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
  ) {}

  async create(
    hotelId: number,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    // 1. Verify hotel exists and is active
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }
    if (!hotel.isActive) {
      throw new BadRequestException('Target hotel is inactive');
    }

    // 2. Check for duplicate name in same hotel
    const existing = await this.categoryRepository.findOne({
      where: { hotelId, name: createCategoryDto.name },
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        Object.assign(existing, createCategoryDto);
        return await this.categoryRepository.save(existing);
      }
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists in this hotel`,
      );
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      hotelId,
    });
    return await this.categoryRepository.save(category);
  }

  async findAllForHotel(
    hotelId: number,
    activeOnly = true,
  ): Promise<Category[]> {
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }

    const query = this.categoryRepository.createQueryBuilder('category')
      .where('category.hotelId = :hotelId', { hotelId })
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.id', 'ASC')
      .loadRelationCountAndMap('category.foodCount', 'category.foods');

    if (activeOnly) {
      query.andWhere('category.isActive = :isActive', { isActive: true });
    }

    return await query.getMany();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { hotelId: category.hotelId, name: updateCategoryDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists in this hotel`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async deactivate(id: number): Promise<Category> {
    const category = await this.findOne(id);
    category.isActive = false;
    return await this.categoryRepository.save(category);
  }
}
