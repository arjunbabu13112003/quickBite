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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HotelAdminsService } from '../hotel-admins/hotel-admins.service';

@Controller()
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly hotelAdminsService: HotelAdminsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post('hotels/:hotelId/categories')
  async create(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        hotelId,
      );
    }
    return this.categoriesService.create(hotelId, createCategoryDto);
  }

  @Get('hotels/:hotelId/categories')
  findAllForHotel(@Param('hotelId', ParseIntPipe) hotelId: number) {
    return this.categoriesService.findAllForHotel(hotelId, false);
  }

  @Get('categories/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('categories/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req,
  ) {
    const category = await this.categoriesService.findOne(id);
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        category.hotelId,
      );
    }
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('categories/:id/deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const category = await this.categoriesService.findOne(id);
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        category.hotelId,
      );
    }
    return this.categoriesService.deactivate(id);
  }
}
