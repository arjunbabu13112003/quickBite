import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FoodCustomizationGroup } from './food-customization-group.entity';
import { FoodCustomizationChoice } from './food-customization-choice.entity';
import { Food } from '../foods/food.entity';
import { CreateCustomizationGroupDto } from './dto/create-customization-group.dto';
import { CreateCustomizationChoiceDto } from './dto/create-customization-choice.dto';
import { UpdateCustomizationGroupDto } from './dto/update-customization-group.dto';
import { UpdateCustomizationChoiceDto } from './dto/update-customization-choice.dto';

@Injectable()
export class FoodCustomizationsService {
  constructor(
    @InjectRepository(FoodCustomizationGroup)
    private readonly groupRepository: Repository<FoodCustomizationGroup>,
    @InjectRepository(FoodCustomizationChoice)
    private readonly choiceRepository: Repository<FoodCustomizationChoice>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
    private readonly dataSource: DataSource,
  ) {}

  async createGroupWithChoices(
    foodId: number,
    dto: CreateCustomizationGroupDto,
  ): Promise<FoodCustomizationGroup> {
    // 1. Verify active food, hotel, and category
    const food = await this.foodRepository.findOne({
      where: { id: foodId },
      relations: ['hotel', 'category'],
    });

    if (!food || !food.isActive) {
      throw new NotFoundException(
        `Food with ID ${foodId} not found or is inactive`,
      );
    }

    if (!food.hotel || !food.hotel.isActive) {
      throw new BadRequestException('Food hotel is inactive or does not exist');
    }

    if (!food.category || !food.category.isActive) {
      throw new BadRequestException(
        'Food category is inactive or does not exist',
      );
    }

    // 2. Perform business validation on Group rules
    const isRequired = dto.isRequired ?? false;
    const displayOrder = dto.displayOrder ?? 0;

    // Duplicate group name check removed per user request

    // 3. Perform business validation on Choice rules
    if (!dto.choices || dto.choices.length === 0) {
      throw new BadRequestException('At least one choice must be provided');
    }

    // Duplicate choice names check within payload choices
    const choiceNames = dto.choices.map((c) => c.name.trim().toLowerCase());
    const uniqueNames = new Set(choiceNames);
    if (uniqueNames.size !== choiceNames.length) {
      throw new BadRequestException(
        'Choice names in the same group must be unique',
      );
    }

    for (const choice of dto.choices) {
      if (!choice.name || choice.name.trim() === '') {
        throw new BadRequestException(
          'Choice name is required and cannot be empty',
        );
      }
      const additionalPrice = choice.additionalPrice ?? 0;
      if (additionalPrice < 0) {
        throw new BadRequestException(
          'Choice additionalPrice must be greater than or equal to 0',
        );
      }
    }

    // 4. Run database transaction to save Group and Choices
    return await this.dataSource.transaction(async (manager) => {
      const groupEntity = manager.create(FoodCustomizationGroup, {
        foodId,
        name: dto.name,
        selectionType: dto.selectionType ?? 'multiple',
        isRequired,
        displayOrder,
        isActive: true,
      });

      const savedGroup = await manager.save(FoodCustomizationGroup, groupEntity);

      const choiceEntities = dto.choices.map((c) =>
        manager.create(FoodCustomizationChoice, {
          groupId: savedGroup.id,
          name: c.name,
          additionalPrice: c.additionalPrice ?? 0,
          displayOrder: c.displayOrder ?? 0,
          isActive: true,
          isAvailable: true,
        }),
      );

      savedGroup.choices = await manager.save(
        FoodCustomizationChoice,
        choiceEntities,
      );
      return savedGroup;
    });
  }

  async addChoiceToGroup(
    groupId: number,
    dto: CreateCustomizationChoiceDto,
  ): Promise<FoodCustomizationChoice> {
    // 1. Verify group exists and is active
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });
    if (!group || !group.isActive) {
      throw new NotFoundException(
        `Customization group with ID ${groupId} not found or is inactive`,
      );
    }

    // 2. Validate choice properties
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException(
        'Choice name is required and cannot be empty',
      );
    }
    const additionalPrice = dto.additionalPrice ?? 0;
    if (additionalPrice < 0) {
      throw new BadRequestException(
        'Choice additionalPrice must be greater than or equal to 0',
      );
    }

    // Duplicate choice name check (case-insensitive) within the same group
    const duplicateChoice = await this.choiceRepository
      .createQueryBuilder('c')
      .where('c.groupId = :groupId', { groupId })
      .andWhere('c.isActive = :isActive', { isActive: true })
      .andWhere('LOWER(c.name) = LOWER(:name)', { name: dto.name })
      .getOne();
    if (duplicateChoice) {
      throw new ConflictException(
        `A choice with name "${dto.name}" already exists in this customization group`,
      );
    }

    const choice = this.choiceRepository.create({
      groupId,
      name: dto.name,
      additionalPrice,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
      isAvailable: true,
    });

    return await this.choiceRepository.save(choice);
  }

  async getCustomizationsForFood(
    foodId: number,
  ): Promise<FoodCustomizationGroup[]> {
    const groups = await this.groupRepository.find({
      where: { foodId, isActive: true },
      relations: ['choices'],
      order: {
        displayOrder: 'ASC',
        id: 'ASC',
      },
    });

    // Filter active choices and sort them ASC
    for (const group of groups) {
      if (group.choices) {
        group.choices = group.choices
          .filter((choice) => choice.isActive === true)
          .sort((a, b) => {
            if (a.displayOrder !== b.displayOrder) {
              return a.displayOrder - b.displayOrder;
            }
            return a.id - b.id;
          });
      }
    }

    return groups;
  }

  async updateGroup(
    groupId: number,
    dto: UpdateCustomizationGroupDto,
  ): Promise<FoodCustomizationGroup> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['choices'],
    });
    if (!group) {
      throw new NotFoundException(
        `Customization group with ID ${groupId} not found`,
      );
    }

    // Duplicate group name check removed per user request

    // 2. Validate selection ranges considering both provided and existing values
    const isRequired =
      dto.isRequired !== undefined ? dto.isRequired : group.isRequired;

    Object.assign(group, dto);
    return await this.groupRepository.save(group);
  }

  async updateChoice(
    choiceId: number,
    dto: UpdateCustomizationChoiceDto,
  ): Promise<FoodCustomizationChoice> {
    const choice = await this.choiceRepository.findOne({
      where: { id: choiceId },
    });
    if (!choice) {
      throw new NotFoundException(
        `Customization choice with ID ${choiceId} not found`,
      );
    }

    // 1. Duplicate choice name check (case-insensitive)
    if (dto.name && dto.name.toLowerCase() !== choice.name.toLowerCase()) {
      const duplicateChoice = await this.choiceRepository
        .createQueryBuilder('c')
        .where('c.groupId = :groupId', { groupId: choice.groupId })
        .andWhere('c.isActive = :isActive', { isActive: true })
        .andWhere('LOWER(c.name) = LOWER(:name)', { name: dto.name })
        .getOne();
      if (duplicateChoice) {
        throw new ConflictException(
          `A choice with name "${dto.name}" already exists in this customization group`,
        );
      }
    }

    Object.assign(choice, dto);
    return await this.choiceRepository.save(choice);
  }

  async updateChoiceAvailability(
    choiceId: number,
    isAvailable: boolean,
  ): Promise<FoodCustomizationChoice> {
    const choice = await this.choiceRepository.findOne({
      where: { id: choiceId },
    });
    if (!choice) {
      throw new NotFoundException(
        `Customization choice with ID ${choiceId} not found`,
      );
    }

    if (isAvailable === choice.isAvailable) {
      return choice;
    }

    if (isAvailable === false) {
      // Before marking choice unavailable, verify the group remains logically usable
      const group = await this.groupRepository.findOne({
        where: { id: choice.groupId },
        relations: ['choices'],
      });
      if (group && group.isRequired) {
        const remainingAvailableCount = group.choices.filter(
          (c) => c.isActive && c.isAvailable && c.id !== choiceId,
        ).length;
        if (remainingAvailableCount < 1) {
          throw new BadRequestException(
            `Cannot mark choice unavailable because the group requires at least 1 available choice`,
          );
        }
      }
    }

    choice.isAvailable = isAvailable;
    return await this.choiceRepository.save(choice);
  }

  async deactivateChoice(choiceId: number): Promise<FoodCustomizationChoice> {
    const choice = await this.choiceRepository.findOne({
      where: { id: choiceId },
    });
    if (!choice) {
      throw new NotFoundException(
        `Customization choice with ID ${choiceId} not found`,
      );
    }

    if (!choice.isActive) {
      return choice;
    }

    // Verify parent group requirements won't become impossible
    const group = await this.groupRepository.findOne({
      where: { id: choice.groupId },
      relations: ['choices'],
    });

    if (group && group.isRequired) {
      const remainingActiveCount = group.choices.filter(
        (c) => c.isActive && c.id !== choiceId,
      ).length;
      if (remainingActiveCount < 1) {
        throw new BadRequestException(
          `Cannot deactivate choice because the group requires at least 1 active choice`,
        );
      }

      // Also verify available choices
      const remainingAvailableCount = group.choices.filter(
        (c) => c.isActive && c.isAvailable && c.id !== choiceId,
      ).length;
      if (remainingAvailableCount < 1) {
        throw new BadRequestException(
          `Cannot deactivate choice because the group requires at least 1 available choice`,
        );
      }
    }

    choice.isActive = false;
    return await this.choiceRepository.save(choice);
  }

  async deactivateGroup(
    groupId: number,
  ): Promise<FoodCustomizationGroup> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException(
        `Customization group with ID ${groupId} not found`,
      );
    }

    if (!group.isActive) {
      return group;
    }

    group.isActive = false;
    return await this.groupRepository.save(group);
  }
}
