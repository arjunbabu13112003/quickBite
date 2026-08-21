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
} from '@nestjs/common';
import { DeliveryPartnersService } from './delivery-partners.service';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { AdminCreateDeliveryPartnerDto } from './dto/admin-create-delivery-partner.dto';
import { UpdateDeliveryPartnerStatusDto } from './dto/update-delivery-partner-status.dto';
import { VerifyDeliveryPartnerDto } from './dto/verify-delivery-partner.dto';
import { AssignDeliveryPartnerDto } from './dto/assign-delivery-partner.dto';
import { UpdateDeliveryOrderStatusDto } from './dto/update-delivery-order-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryPartnersController {
  constructor(
    private readonly partnersService: DeliveryPartnersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // --- SUPER_ADMIN ROUTES ---

  @Roles(UserRole.SUPER_ADMIN)
  @Post('delivery-partners/admin-create')
  adminCreate(@Body() dto: AdminCreateDeliveryPartnerDto) {
    return this.partnersService.adminCreate(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('delivery-partners')
  createProfile(@Body() dto: CreateDeliveryPartnerDto) {
    return this.partnersService.createProfile(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('delivery-partners')
  findAll(
    @Query('online') online?: string,
    @Query('available') available?: string,
    @Query('verified') verified?: string,
    @Query('active') active?: string,
  ) {
    const isOnline = online !== undefined ? online === 'true' : undefined;
    const isAvailable =
      available !== undefined ? available === 'true' : undefined;
    const isVerified =
      verified !== undefined ? verified === 'true' : undefined;
    const isActive = active !== undefined ? active === 'true' : undefined;

    return this.partnersService.listPartners(
      isOnline,
      isAvailable,
      isVerified,
      isActive,
    );
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('delivery-partners/:partnerId/verify')
  verify(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Body() dto: VerifyDeliveryPartnerDto,
  ) {
    return this.partnersService.verifyPartner(partnerId, dto.isVerified);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('orders/:orderId/delivery-assignment')
  assignOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: AssignDeliveryPartnerDto,
  ) {
    return this.partnersService.assignOrder(orderId, dto.deliveryPartnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('orders/:orderId/delivery-assignment')
  getActiveAssignment(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.partnersService.getActiveAssignment(orderId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('delivery-partners/:id')
  getPartnerDetailsForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.getPartnerDetailsForAdmin(id);
  }

  // --- DELIVERY_PARTNER ROUTES ---

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me')
  getMe(@Request() req) {
    return this.partnersService.getProfile(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/status')
  updateStatus(@Body() dto: UpdateDeliveryPartnerStatusDto, @Request() req) {
    return this.partnersService.updateStatus(req.user.userId, dto);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/location')
  updateLocation(@Body() dto: UpdateLocationDto, @Request() req) {
    return this.partnersService.updateLocation(req.user.userId, dto.latitude, dto.longitude);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/orders')
  getAssignedOrders(@Request() req) {
    return this.partnersService.getAssignedOrders(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/orders/history')
  getDeliveryHistory(@Request() req) {
    return this.partnersService.getDeliveryHistory(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/orders/:orderId')
  getAssignedOrderDetails(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    return this.partnersService.getAssignedOrderDetails(
      req.user.userId,
      orderId,
    );
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/orders/:orderId/status')
  updateDeliveryOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateDeliveryOrderStatusDto,
    @Request() req,
  ) {
    return this.partnersService.updateDeliveryOrderStatus(
      req.user.userId,
      orderId,
      dto.status,
    );
  }

  /**
   * POST /orders/:orderId/cod/collect
   *
   * Allows the assigned delivery partner to confirm COD cash collection.
   *
   * Authorization:
   *   - JWT must belong to a DELIVERY_PARTNER user
   *   - Partner identity is derived from the JWT (req.user.userId), NOT from the request body
   *   - The backend verifies the partner was assigned to this order
   *
   * Body: none (no amount, no partnerId, no paymentStatus accepted from client)
   */
  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('orders/:orderId/cod/collect')
  collectCodCash(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    return this.paymentsService.collectCodCash(req.user.userId, orderId);
  }
}
