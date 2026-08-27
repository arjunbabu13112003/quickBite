import { Controller, Post, Get, Patch, Delete, Param, ParseIntPipe, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { HotelAdminsService } from '../hotel-admins/hotel-admins.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly hotelAdminsService: HotelAdminsService,
  ) {}

  private async getHotelIdForAdmin(userId: number): Promise<number> {
    const hotels = await this.hotelAdminsService.getMyHotels(userId);
    const activeHotels = (hotels || []).filter((h) => h.isActive);
    if (activeHotels.length === 0) {
      throw new ForbiddenException('You do not have administrative access to any active hotel');
    }
    return activeHotels[0].id;
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/notify-restaurant/:orderId')
  notifyRestaurant(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.notificationsService.notifyRestaurant(orderId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Get('hotel/me')
  async getHotelNotifications(@Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.notificationsService.getHotelNotifications(hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Patch('hotel/me/:id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.notificationsService.markAsRead(id, hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Delete('hotel/me/:id')
  async deleteNotification(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.notificationsService.deleteNotification(id, hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Delete('hotel/me')
  async clearAllNotifications(@Request() req) {
    const hotelId = await this.getHotelIdForAdmin(req.user.userId);
    return this.notificationsService.clearAllNotifications(hotelId);
  }

  // --- DELIVERY PARTNER NOTIFICATIONS ---

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('partner/me')
  getPartnerNotifications(@Request() req) {
    return this.notificationsService.getPartnerNotifications(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('partner/me/read-all')
  markAllPartnerAsRead(@Request() req) {
    return this.notificationsService.markAllPartnerAsRead(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('partner/me/:id/read')
  markPartnerAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.markPartnerAsRead(id, req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Delete('partner/me/:id')
  deletePartnerNotification(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.deletePartnerNotification(id, req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Delete('partner/me')
  clearAllPartnerNotifications(@Request() req) {
    return this.notificationsService.clearAllPartnerNotifications(req.user.userId);
  }
}
