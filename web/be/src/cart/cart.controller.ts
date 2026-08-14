import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  addToCart(@Body() dto: AddToCartDto, @Request() req) {
    return this.cartService.addToCart(req.user.userId, dto);
  }

  @Get()
  getCart(@Request() req) {
    return this.cartService.getCart(req.user.userId);
  }

  @Patch('items/:cartItemId')
  updateQuantity(
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
    @Body() dto: UpdateCartItemQuantityDto,
    @Request() req,
  ) {
    return this.cartService.updateCartItemQuantity(
      req.user.userId,
      cartItemId,
      dto,
    );
  }

  @Delete('items/:cartItemId')
  removeItem(
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
    @Request() req,
  ) {
    return this.cartService.removeCartItem(req.user.userId, cartItemId);
  }

  @Delete()
  clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.userId);
  }
}
