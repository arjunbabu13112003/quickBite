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
import { FoodReviewsService } from './food-reviews.service';
import { CreateFoodReviewDto } from './dto/create-food-review.dto';
import { UpdateFoodReviewDto } from './dto/update-food-review.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller()
export class FoodReviewsController {
  constructor(private readonly reviewsService: FoodReviewsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('foods/:foodId/reviews')
  create(
    @Param('foodId', ParseIntPipe) foodId: number,
    @Body() dto: CreateFoodReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.create(req.user.userId, foodId, dto);
  }

  @Get('foods/:foodId/reviews')
  findAll(
    @Param('foodId', ParseIntPipe) foodId: number,
    @Query('sort') sort?: string,
  ) {
    return this.reviewsService.getReviewsForFood(foodId, sort);
  }

  @Get('foods/:foodId/rating-summary')
  getSummary(@Param('foodId', ParseIntPipe) foodId: number) {
    return this.reviewsService.getRatingSummary(foodId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('foods/:foodId/reviews/me')
  getMe(@Param('foodId', ParseIntPipe) foodId: number, @Request() req) {
    return this.reviewsService.getReviewMe(req.user.userId, foodId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Patch('foods/:foodId/reviews/me')
  update(
    @Param('foodId', ParseIntPipe) foodId: number,
    @Body() dto: UpdateFoodReviewDto,
    @Request() req,
  ) {
    return this.reviewsService.updateReview(req.user.userId, foodId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Delete('foods/:foodId/reviews/me')
  deactivate(@Param('foodId', ParseIntPipe) foodId: number, @Request() req) {
    return this.reviewsService.deactivateReview(req.user.userId, foodId);
  }
}
