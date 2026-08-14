import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { HomeFoodCategory } from './home-food-category.entity';
import { Food } from '../foods/food.entity';

@Injectable()
export class HomeFoodCategoriesService {
  constructor(
    @InjectRepository(HomeFoodCategory)
    private homeFoodCategoryRepository: Repository<HomeFoodCategory>,
    private dataSource: DataSource,
  ) {}

  async findAll() {
    const categories = await this.homeFoodCategoryRepository.find({
      relations: ['foods'],
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return categories.map(c => {
      const { foods, ...rest } = c;
      return {
        ...rest,
        foodCount: foods ? foods.length : 0,
      };
    });
  }

  async findActive() {
    const list = await this.homeFoodCategoryRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return list.map(c => ({
      ...c,
      imageUrl: c.image,
    }));
  }

  async findFoodsForCategory(id: number) {
    return this.dataSource.getRepository(Food).find({
      where: {
        homeFoodCategoryId: id,
        isActive: true,
        isAvailable: true,
        category: { isActive: true },
        hotel: { isActive: true },
      },
      relations: ['hotel', 'category'],
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  async findUnassignedFoods() {
    return this.dataSource.getRepository(Food).find({
      where: { homeFoodCategoryId: IsNull() },
      relations: ['hotel', 'category'],
    });
  }

  async create(createDto: any) {
    if (!createDto.name) {
      throw new BadRequestException('Category name is required.');
    }
    const existing = await this.homeFoodCategoryRepository.findOne({ where: { name: createDto.name } });
    if (existing) {
      throw new BadRequestException('A category with this name already exists.');
    }

    const newCategory = this.homeFoodCategoryRepository.create({
      name: createDto.name,
      image: createDto.image,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      displayOrder: createDto.displayOrder || 0,
    });
    return this.homeFoodCategoryRepository.save(newCategory);
  }

  async update(id: number, updateDto: any) {
    const category = await this.homeFoodCategoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Home Food Category not found.');
    }

    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.homeFoodCategoryRepository.findOne({ where: { name: updateDto.name } });
      if (existing) {
        throw new BadRequestException('A category with this name already exists.');
      }
    }

    Object.assign(category, updateDto);
    return this.homeFoodCategoryRepository.save(category);
  }
}
