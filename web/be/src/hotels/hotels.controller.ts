import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateOpenStatusDto } from './dto/update-open-status.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HotelAdminsService } from '../hotel-admins/hotel-admins.service';

// ─── Multer storage for hotel images ────────────────────────────────────────
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'hotels');

const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `hotel-${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
  },
});

@Controller('hotels')
export class HotelsController {
  constructor(
    private readonly hotelsService: HotelsService,
    private readonly hotelAdminsService: HotelAdminsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() createHotelDto: CreateHotelDto) {
    return this.hotelsService.create(createHotelDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/all')
  findAllForAdmin() {
    return this.hotelsService.findAllForAdmin();
  }

  @Get()
  findAll() {
    return this.hotelsService.findAllActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hotelsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHotelDto: UpdateHotelDto,
  ) {
    return this.hotelsService.update(id, updateHotelDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.hotelsService.deactivate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch(':id/open-status')
  async updateOpenStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOpenStatusDto: UpdateOpenStatusDto,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(req.user.userId, id);
    }
    return this.hotelsService.updateOpenStatus(id, updateOpenStatusDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch(':id/profile')
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProfileDto: any,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(req.user.userId, id);
    }
    return this.hotelsService.updateProfile(id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post(':id/upload-logo')
  @UseInterceptors(FileInterceptor('file', { storage: multerStorage }))
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(req.user.userId, id);
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/uploads/hotels/${file.filename}`;
    await this.hotelsService.updateProfile(id, { logo: logoUrl });
    return { url: logoUrl };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post(':id/upload-cover')
  @UseInterceptors(FileInterceptor('file', { storage: multerStorage }))
  async uploadCover(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(req.user.userId, id);
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const coverUrl = `${baseUrl}/uploads/hotels/${file.filename}`;
    await this.hotelsService.updateProfile(id, { image: coverUrl });
    return { url: coverUrl };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Post(':id/upload-gallery')
  @UseInterceptors(FileInterceptor('file', { storage: multerStorage }))
  async uploadGallery(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(req.user.userId, id);
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/hotels/${file.filename}`;
    
    const hotel = await this.hotelsService.findOne(id);
    let galleryArr: string[] = [];
    if (hotel.gallery) {
      try {
        galleryArr = JSON.parse(hotel.gallery);
        if (!Array.isArray(galleryArr)) galleryArr = [];
      } catch (e) {
        galleryArr = [];
      }
    }
    galleryArr.push(imageUrl);
    await this.hotelsService.updateProfile(id, { gallery: JSON.stringify(galleryArr) });

    return { url: imageUrl, gallery: galleryArr };
  }
}
