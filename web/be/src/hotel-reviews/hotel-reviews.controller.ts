import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { HotelReviewsService } from './hotel-reviews.service';
import { CreateHotelReviewDto } from './dto/create-hotel-review.dto';
import { UpdateHotelReviewDto } from './dto/update-hotel-review.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller()
export class HotelReviewsController {
  constructor(private readonly reviewsService: HotelReviewsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('hotels/:hotelId/reviews')
  create(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() dto: CreateHotelReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.create(req.user.userId, hotelId, dto);
  }

  @Get('hotels/:hotelId/reviews')
  findAll(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Query('sort') sort?: string,
  ) {
    return this.reviewsService.getReviewsForHotel(hotelId, sort);
  }

  @Get('hotels/:hotelId/rating-summary')
  getSummary(@Param('hotelId', ParseIntPipe) hotelId: number) {
    return this.reviewsService.getRatingSummary(hotelId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('hotels/:hotelId/reviews/me')
  getMe(@Param('hotelId', ParseIntPipe) hotelId: number, @Request() req) {
    return this.reviewsService.getReviewMe(req.user.userId, hotelId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Patch('hotels/:hotelId/reviews/me')
  update(
    @Param('hotelId', ParseIntPipe) hotelId: number,
    @Body() dto: UpdateHotelReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.updateReview(req.user.userId, hotelId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Delete('hotels/:hotelId/reviews/me')
  deactivate(@Param('hotelId', ParseIntPipe) hotelId: number, @Request() req) {
    return this.reviewsService.deactivateReview(req.user.userId, hotelId);
  }
}
