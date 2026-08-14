import { Controller, Post, Get, Patch, Delete, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/notify-restaurant/:orderId')
  notifyRestaurant(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.notificationsService.notifyRestaurant(orderId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Get('hotel/me')
  getHotelNotifications(@Request() req) {
    return this.notificationsService.getHotelNotifications(req.user.hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Patch('hotel/me/:id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Delete('hotel/me/:id')
  deleteNotification(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.deleteNotification(id, req.user.hotelId);
  }

  @Roles(UserRole.HOTEL_ADMIN)
  @Delete('hotel/me')
  clearAllNotifications(@Request() req) {
    return this.notificationsService.clearAllNotifications(req.user.hotelId);
  }
}
