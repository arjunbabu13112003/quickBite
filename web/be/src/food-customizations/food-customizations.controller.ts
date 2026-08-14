import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { FoodCustomizationsService } from './food-customizations.service';
import { CreateCustomizationGroupDto } from './dto/create-customization-group.dto';
import { CreateCustomizationChoiceDto } from './dto/create-customization-choice.dto';
import { UpdateCustomizationGroupDto } from './dto/update-customization-group.dto';
import { UpdateCustomizationChoiceDto } from './dto/update-customization-choice.dto';
import { UpdateCustomizationChoiceAvailabilityDto } from './dto/update-customization-choice-availability.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HotelAdminsService } from '../hotel-admins/hotel-admins.service';
import { FoodsService } from '../foods/foods.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FoodCustomizationGroup } from './food-customization-group.entity';
import { FoodCustomizationChoice } from './food-customization-choice.entity';
import { Repository } from 'typeorm';

@Controller()
export class FoodCustomizationsController {
  constructor(
    private readonly customizationsService: FoodCustomizationsService,
    private readonly hotelAdminsService: HotelAdminsService,
    private readonly foodsService: FoodsService,
    @InjectRepository(FoodCustomizationGroup)
    private readonly groupRepository: Repository<FoodCustomizationGroup>,
    @InjectRepository(FoodCustomizationChoice)
    private readonly choiceRepository: Repository<FoodCustomizationChoice>,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post('foods/:foodId/customization-groups')
  async createGroup(
    @Param('foodId', ParseIntPipe) foodId: number,
    @Body() dto: CreateCustomizationGroupDto,
    @Request() req,
  ) {
    const food = await this.foodsService.findOne(foodId);
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        food.hotelId,
      );
    }
    return this.customizationsService.createGroupWithChoices(foodId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post('customization-groups/:groupId/choices')
  async addChoice(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateCustomizationChoiceDto,
    @Request() req,
  ) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['food'],
    });
    if (!group) {
      throw new NotFoundException(
        `Customization group with ID ${groupId} not found`,
      );
    }
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      if (!group.food) {
        throw new NotFoundException('Related food not found for group');
      }
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        group.food.hotelId,
      );
    }
    return this.customizationsService.addChoiceToGroup(groupId, dto);
  }

  @Get('foods/:foodId/customizations')
  getCustomizations(@Param('foodId', ParseIntPipe) foodId: number) {
    return this.customizationsService.getCustomizationsForFood(foodId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('customization-groups/:groupId')
  async updateGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: UpdateCustomizationGroupDto,
    @Request() req,
  ) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['food'],
    });
    if (!group) {
      throw new NotFoundException(
        `Customization group with ID ${groupId} not found`,
      );
    }
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      if (!group.food) {
        throw new NotFoundException('Related food not found for group');
      }
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        group.food.hotelId,
      );
    }
    return this.customizationsService.updateGroup(groupId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('customization-groups/:groupId/deactivate')
  async deactivateGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Request() req,
  ) {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['food'],
    });
    if (!group) {
      throw new NotFoundException(
        `Customization group with ID ${groupId} not found`,
      );
    }
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      if (!group.food) {
        throw new NotFoundException('Related food not found for group');
      }
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        group.food.hotelId,
      );
    }
    return this.customizationsService.deactivateGroup(groupId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('customization-choices/:choiceId')
  async updateChoice(
    @Param('choiceId', ParseIntPipe) choiceId: number,
    @Body() dto: UpdateCustomizationChoiceDto,
    @Request() req,
  ) {
    const choice = await this.choiceRepository.findOne({
      where: { id: choiceId },
      relations: ['group', 'group.food'],
    });
    if (!choice) {
      throw new NotFoundException(
        `Customization choice with ID ${choiceId} not found`,
      );
    }
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      if (!choice.group || !choice.group.food) {
        throw new NotFoundException('Related food/group not found for choice');
      }
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        choice.group.food.hotelId,
      );
    }
    return this.customizationsService.updateChoice(choiceId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('customization-choices/:choiceId/availability')
  async updateChoiceAvailability(
    @Param('choiceId', ParseIntPipe) choiceId: number,
    @Body() dto: UpdateCustomizationChoiceAvailabilityDto,
    @Request() req,
  ) {
    const choice = await this.choiceRepository.findOne({
      where: { id: choiceId },
      relations: ['group', 'group.food'],
    });
    if (!choice) {
      throw new NotFoundException(
        `Customization choice with ID ${choiceId} not found`,
      );
    }
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      if (!choice.group || !choice.group.food) {
        throw new NotFoundException('Related food/group not found for choice');
      }
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        choice.group.food.hotelId,
      );
    }
    return this.customizationsService.updateChoiceAvailability(
      choiceId,
      dto.isAvailable,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('customization-choices/:choiceId/deactivate')
  async deactivateChoice(
    @Param('choiceId', ParseIntPipe) choiceId: number,
    @Request() req,
  ) {
    const choice = await this.choiceRepository.findOne({
      where: { id: choiceId },
      relations: ['group', 'group.food'],
    });
    if (!choice) {
      throw new NotFoundException(
        `Customization choice with ID ${choiceId} not found`,
      );
    }
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      if (!choice.group || !choice.group.food) {
        throw new NotFoundException('Related food/group not found for choice');
      }
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        choice.group.food.hotelId,
      );
    }
    return this.customizationsService.deactivateChoice(choiceId);
  }
}
