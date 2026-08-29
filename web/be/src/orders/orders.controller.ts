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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateHotelOrderStatusDto } from './dto/update-hotel-order-status.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HotelAdminsService } from '../hotel-admins/hotel-admins.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly hotelAdminsService: HotelAdminsService,
  ) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get('orders/admin/all')
  findAllForAdmin() {
    return this.ordersService.findAllForAdmin();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('orders/admin/analytics')
  getPlatformAnalytics(
    @Query('restaurantId') restaurantId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getPlatformAnalytics(
      restaurantId ? Number(restaurantId) : undefined,
      startDate,
      endDate,
    );
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('orders/admin/:id')
  async getOrderDetailsForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderDetailsForAdmin(id);
  }

  // --- CUSTOMER ROUTES ---

  @Roles(UserRole.CUSTOMER)
  @Post('orders')
  create(@Body() dto: CreateOrderDto, @Request() req) {
    return this.ordersService.createOrder(req.user.userId, dto);
  }

  @Roles(UserRole.CUSTOMER)
  @Get('orders')
  findAll(@Request() req) {
    return this.ordersService.getOrders(req.user.userId);
  }

  @Roles(UserRole.CUSTOMER)
  @Get('orders/:orderId')
  findOne(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    return this.ordersService.getOrderDetails(req.user.userId, orderId);
  }

  @Roles(UserRole.CUSTOMER)
  @Get('orders/:orderId/delivery-pin')
  getDeliveryPin(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    return this.ordersService.getOrderPin(req.user.userId, orderId);
  }

  // --- HOTEL MANAGEMENT ROUTES ---

  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Get('hotels/:hotelId/orders')
  async findHotelOrders(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Query('status') status: string,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        hotelId,
      );
    }
    return this.ordersService.getHotelOrders(hotelId, status);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Get('hotels/:hotelId/orders/:orderId')
  async findHotelOrderDetails(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        hotelId,
      );
    }
    return this.ordersService.getHotelOrderDetails(hotelId, orderId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.HOTEL_ADMIN)
  @Patch('hotels/:hotelId/orders/:orderId/status')
  async updateStatus(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateHotelOrderStatusDto,
    @Request() req,
  ) {
    if (req.user.role === UserRole.HOTEL_ADMIN) {
      await this.hotelAdminsService.checkHotelAdminAccess(
        req.user.userId,
        hotelId,
      );
    }
    return this.ordersService.updateHotelOrderStatus(
      hotelId,
      orderId,
      dto.status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('orders/:orderId/cancel')
  async cancelOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    return this.ordersService.cancelOrder(req.user.userId, orderId);
  }
}
