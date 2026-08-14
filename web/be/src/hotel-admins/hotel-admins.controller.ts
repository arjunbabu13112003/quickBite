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
import { HotelAdminsService } from './hotel-admins.service';
import { AssignHotelAdminDto } from './dto/assign-hotel-admin.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller()
export class HotelAdminsController {
  constructor(private readonly hotelAdminsService: HotelAdminsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('hotels/:hotelId/admins')
  assign(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() dto: AssignHotelAdminDto,
  ) {
    return this.hotelAdminsService.assign(hotelId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('hotels/:hotelId/admins')
  getAdmins(@Param('hotelId', ParseIntPipe) hotelId: number) {
    return this.hotelAdminsService.getAdminsForHotel(hotelId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('hotels/:hotelId/admins/:adminId/deactivate')
  deactivate(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Param('adminId', ParseIntPipe) adminId: number,
  ) {
    return this.hotelAdminsService.deactivate(hotelId, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOTEL_ADMIN)
  @Get('hotel-admins/my-hotels')
  getMyHotels(@Request() req) {
    return this.hotelAdminsService.getMyHotels(req.user.userId);
  }
}
