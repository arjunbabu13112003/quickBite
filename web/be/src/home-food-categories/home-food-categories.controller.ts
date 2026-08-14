import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { HomeFoodCategoriesService } from './home-food-categories.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'home-food-categories');

const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `category-${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('home-food-categories')
export class HomeFoodCategoriesController {
  constructor(private readonly homeFoodCategoriesService: HomeFoodCategoriesService) {}

  @Get('active')
  findActive() {
    return this.homeFoodCategoriesService.findActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.homeFoodCategoriesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() createDto: any) {
    return this.homeFoodCategoriesService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multerStorage,
      fileFilter: multerFileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    return { url: `${baseUrl}/uploads/home-food-categories/${file.filename}` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('unassigned/foods')
  findUnassignedFoods() {
    return this.homeFoodCategoriesService.findUnassignedFoods();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id/foods')
  findFoodsForCategory(@Param('id', ParseIntPipe) id: number) {
    return this.homeFoodCategoriesService.findFoodsForCategory(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.homeFoodCategoriesService.update(+id, updateDto);
  }
}
