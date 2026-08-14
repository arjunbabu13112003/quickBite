import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { FavouritesService } from './favourites.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('favourites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  // --- HOTEL FAVOURITES ---

  @Post('hotels/:hotelId')
  addHotel(@Param('hotelId', ParseIntPipe) hotelId: number, @Request() req) {
    return this.favouritesService.addHotelFavourite(req.user.userId, hotelId);
  }

  @Delete('hotels/:hotelId')
  removeHotel(@Param('hotelId', ParseIntPipe) hotelId: number, @Request() req) {
    return this.favouritesService.removeHotelFavourite(req.user.userId, hotelId);
  }

  @Get('hotels')
  getHotels(@Request() req) {
    return this.favouritesService.getHotelFavourites(req.user.userId);
  }

  @Get('hotels/:hotelId/status')
  getHotelStatus(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Request() req,
  ) {
    return this.favouritesService.getHotelFavouriteStatus(
      req.user.userId,
      hotelId,
    );
  }

  // --- FOOD FAVOURITES ---

  @Post('foods/:foodId')
  addFood(@Param('foodId', ParseIntPipe) foodId: number, @Request() req) {
    return this.favouritesService.addFoodFavourite(req.user.userId, foodId);
  }

  @Delete('foods/:foodId')
  removeFood(@Param('foodId', ParseIntPipe) foodId: number, @Request() req) {
    return this.favouritesService.removeFoodFavourite(req.user.userId, foodId);
  }

  @Get('foods')
  getFoods(@Request() req) {
    return this.favouritesService.getFoodFavourites(req.user.userId);
  }

  @Get('foods/:foodId/status')
  getFoodStatus(
    @Param('foodId', ParseIntPipe) foodId: number,
    @Request() req,
  ) {
    return this.favouritesService.getFoodFavouriteStatus(
      req.user.userId,
      foodId,
    );
  }
}
