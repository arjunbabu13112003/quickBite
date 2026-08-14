import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { UpdateFoodAvailabilityDto } from './dto/update-food-availability.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HotelAdminsService } from '../hotel-admins/hotel-admins.service';

// ─── Multer storage for food images ────────────────────────────────────────
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'foods');

const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `food-${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
  },
});

const multerFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per image

@Controller()
export class FoodsController {
  constructor(
    private readonly foodsService: FoodsService,
    private readonly hotelAdminsService: HotelAdminsService,
  ) {}

  // ─── Upload images (multipart) — must be declared before POST foods ───────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post('hotels/:hotelId/foods/upload-images')
  @UseInterceptors(
    FilesInterceptor('images', 3, {
      storage: multerStorage,
      fileFilter: multerFileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFoodImages(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(req.user.userId, hotelId);
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const urls = files.map((f) => `${baseUrl}/uploads/foods/${f.filename}`);

    return { urls };
  }

  // ─── Create food ──────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post('hotels/:hotelId/foods')
  async create(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() createFoodDto: CreateFoodDto,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        hotelId,
      );
    }
    return this.foodsService.create(hotelId, createFoodDto);
  }

  @Get('hotels/:hotelId/foods')
  async findAllForHotel(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Query('categoryId') categoryId?: string,
    @Query('veg') veg?: string,
    @Query('search') search?: string,
    @Query('available') available?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const parsedQuery = {
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      veg: veg === 'true' ? true : veg === 'false' ? false : undefined,
      search,
      available:
        available === 'true'
          ? true
          : available === 'false'
            ? false
            : undefined,
    };
    const isStorefront = activeOnly !== 'false';
    return this.foodsService.findAllForHotel(hotelId, parsedQuery, isStorefront);
  }

  @Get('foods/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.foodsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('foods/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFoodDto: UpdateFoodDto,
    @Request() req,
  ) {
    const food = await this.foodsService.findOne(id);
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        food.hotelId,
      );
    }
    return this.foodsService.update(id, updateFoodDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('foods/:id/availability')
  async updateAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFoodAvailabilityDto,
    @Request() req,
  ) {
    const food = await this.foodsService.findOne(id);
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        food.hotelId,
      );
    }
    return this.foodsService.updateAvailability(id, dto.isAvailable);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('foods/:id/deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const food = await this.foodsService.findOne(id);
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        food.hotelId,
      );
    }
    return this.foodsService.deactivate(id);
  }

  @Get('foods')
  async findAllGlobal(
    @Query('platformHomeCategoryId') platformHomeCategoryId?: string,
  ) {
    const query: any = {};
    if (platformHomeCategoryId) {
      query.homeFoodCategoryId = parseInt(platformHomeCategoryId, 10);
    }
    return this.foodsService.findAllGlobal(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('foods/:id/home-food-category')
  async updateHomeFoodCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body('homeFoodCategoryId') homeFoodCategoryId: number | null,
  ) {
    return this.foodsService.updateHomeFoodCategory(id, homeFoodCategoryId);
  }
}
