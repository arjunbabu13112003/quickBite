import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { HotelAdmin } from '../hotel-admins/hotel-admin.entity';
import { Food } from '../foods/food.entity';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    @InjectRepository(HotelAdmin)
    private readonly hotelAdminRepository: Repository<HotelAdmin>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
  ) {}

  private async getHotelIdForAdmin(userId: number): Promise<number> {
    const assignment = await this.hotelAdminRepository.findOne({
      where: { userId, isActive: true },
    });
    if (!assignment) {
      throw new ForbiddenException('You do not have administrative access to any hotel');
    }
    return assignment.hotelId;
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Post()
  async create(@Body() createOfferDto: CreateOfferDto, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.createOffer(hotelId, createOfferDto);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Get('hotel/me')
  async findAll(@Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.getOffersForHotel(hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.getOfferById(id, hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOfferDto: UpdateOfferDto,
    @Request() req,
  ) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.updateOffer(id, hotelId, updateOfferDto);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.deleteOffer(id, hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Post('hotel/me/:id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.duplicateOffer(id, hotelId);
  }

  /**
   * Customer application verification endpoint.
   * Resolves actual category IDs from DB to prevent client-side security manipulation.
   */
  @Roles(UserRole.CUSTOMER)
  @Post('validate')
  async validateOffer(
    @Request() req,
    @Body()
    body: {
      code: string;
      hotelId: number;
      items: Array<{ foodId: number; quantity: number; finalUnitPrice: number }>;
      subtotal: number;
      deliveryFee: number;
    },
  ) {
    const resolvedItems = [];
    for (const item of body.items) {
      const food = await this.foodRepository.findOne({ where: { id: item.foodId } });
      resolvedItems.push({
        foodId: item.foodId,
        categoryId: food ? food.categoryId : undefined,
        quantity: item.quantity,
        finalUnitPrice: item.finalUnitPrice || (food ? Number(food.offerPrice || food.price) : 0),
      });
    }

    return this.offersService.validateOfferInternal(
      body.code,
      body.hotelId,
      req.user.userId,
      resolvedItems,
      body.subtotal,
      body.deliveryFee,
    );
  }

  @Roles(UserRole.CUSTOMER)
  @Get('hotels/:hotelId/public-offers')
  async getOffersForCustomer(@Param('hotelId', ParseIntPipe) hotelId: number) {
    const now = new Date();
    return this.offersService.getOffersForCustomer(hotelId, now);
  }
}
