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
import { CreateStore99CampaignDto } from './dto/create-campaign.dto';
import { UpdateStore99CampaignDto } from './dto/update-campaign.dto';
import { HotelAdmin } from '../hotel-admins/hotel-admin.entity';
import { Food } from '../foods/food.entity';

@Controller('offers')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@Body() createOfferDto: CreateOfferDto, @Request() req) {
    let hotelId: number | null = null;
    if (req.user.role === UserRole.SUPER_ADMIN) {
      hotelId = createOfferDto['hotelId'] !== undefined ? createOfferDto['hotelId'] : null;
    } else {
      hotelId = await this.getHotelIdForAdmin(req.user.userId);
    }
    return this.offersService.createOffer(hotelId, createOfferDto);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('hotel/me')
  async findAll(@Request() req) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.offersService.getOffersForHotel(null);
    }
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.getOffersForHotel(hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.offersService.getOfferById(id, null);
    }
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.getOfferById(id, hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOfferDto: UpdateOfferDto,
    @Request() req,
  ) {
    let hotelId: number | null = null;
    if (req.user.role === UserRole.SUPER_ADMIN) {
      hotelId = updateOfferDto['hotelId'] !== undefined ? updateOfferDto['hotelId'] : null;
    } else {
      hotelId = await this.getHotelIdForAdmin(req.user.userId);
    }
    return this.offersService.updateOffer(id, hotelId, updateOfferDto);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.offersService.deleteOffer(id, null);
    }
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.deleteOffer(id, hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('hotel/me/:id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.offersService.duplicateOffer(id, null);
    }
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.duplicateOffer(id, hotelId);
  }

  /**
   * Customer application verification endpoint.
   * Resolves actual category IDs from DB to prevent client-side security manipulation.
   */
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get('hotels/:hotelId/public-offers')
  async getOffersForCustomer(@Param('hotelId', ParseIntPipe) hotelId: number) {
    const now = new Date();
    return this.offersService.getOffersForCustomer(hotelId, now);
  }

  @Get('public/all-active')
  async getAllActiveOffers() {
    return this.offersService.getAllActiveOffers();
  }

  @Get('store99/public-campaigns/:id')
  async getPublicCampaignDetails(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.getPublicCampaignDetails(id);
  }

  @Get('store99/public-campaigns')
  async getPublicCampaigns() {
    return this.offersService.getPublicCampaigns();
  }

  // ─── 99 Store Campaign Endpoints ───

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Get('store99/hotel-campaigns')
  async getHotelCampaigns(@Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    console.log(`[DEBUG] getHotelCampaigns - user ID: ${req.user.userId}, resolved hotel ID: ${hotelId}`);
    const campaigns = await this.offersService.getHotelCampaigns(hotelId);
    console.log(`[DEBUG] getHotelCampaigns - campaigns returned for hotel ${hotelId}:`, campaigns.map(c => c.id));
    return campaigns;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Get('store99/active-campaigns')
  async getActiveCampaigns(@Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    console.log(`[DEBUG] getActiveCampaigns - user ID: ${req.user.userId}, resolved hotel ID: ${hotelId}`);
    const campaigns = await this.offersService.getHotelCampaigns(hotelId);
    console.log(`[DEBUG] getActiveCampaigns - campaigns returned for hotel ${hotelId}:`, campaigns.map(c => c.id));
    return campaigns;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Post('store99/campaigns/:campaignId/join')
  async joinCampaign(@Param('campaignId', ParseIntPipe) campaignId: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    console.log(`[DEBUG] joinCampaign - campaignId: ${campaignId}, hotel ID: ${hotelId}`);
    await this.offersService.joinCampaign(campaignId, hotelId);
    return { success: true, message: 'Joined campaign successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Post('store99/campaigns/:campaignId/items')
  async submitCampaignItems(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Request() req,
    @Body() body: { foodIds: number[] },
  ) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    console.log(`[DEBUG] submitCampaignItems - campaignId: ${campaignId}, hotel ID: ${hotelId}, foodIds:`, body.foodIds);
    await this.offersService.submitCampaignItems(campaignId, hotelId, body.foodIds);
    return { success: true, message: 'Items updated successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Post('store99/campaigns/:campaignId/participate')
  async participateInCampaign(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Request() req,
    @Body() body: { foodIds: number[] },
  ) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    console.log(`[DEBUG] participateInCampaign - campaignId: ${campaignId}, hotel ID: ${hotelId}, foodIds:`, body.foodIds);
    await this.offersService.participateInCampaign(campaignId, hotelId, body.foodIds);
    return { success: true, message: 'Participated in campaign successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Post('store99/campaigns/:campaignId/decline')
  async declineCampaign(@Param('campaignId', ParseIntPipe) campaignId: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    console.log(`[DEBUG] declineCampaign - campaignId: ${campaignId}, hotel ID: ${hotelId}`);
    await this.offersService.declineCampaign(campaignId, hotelId);
    return { success: true, message: 'Declined campaign successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Get('store99/campaigns/:campaignId/items')
  async getCampaignItems(@Param('campaignId', ParseIntPipe) campaignId: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.offersService.getCampaignItems(campaignId, hotelId);
  }

  // ─── Super Admin 99 Store Campaign Endpoints ───

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('store99/campaigns')
  async getAllCampaigns() {
    return this.offersService.getAllCampaigns();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('store99/campaigns/:id')
  async getCampaignById(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.getCampaignById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('store99/campaigns')
  async createCampaign(@Body() body: CreateStore99CampaignDto) {
    return this.offersService.createCampaign({
      ...body,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('store99/campaigns/:id')
  async updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStore99CampaignDto,
  ) {
    return this.offersService.updateCampaign(id, {
      ...body,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete('store99/campaigns/:id')
  async deleteCampaign(@Param('id', ParseIntPipe) id: number) {
    await this.offersService.deleteCampaign(id);
    return { success: true, message: 'Campaign deleted successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('store99/campaigns/:id/toggle-active')
  async toggleCampaignActive(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.toggleCampaignActive(id);
  }
}
