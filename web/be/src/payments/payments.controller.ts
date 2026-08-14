import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CreatePaymentAttemptDto } from './dto/create-payment-attempt.dto';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(UserRole.CUSTOMER)
  @Post('orders/:orderId/razorpay/create')
  async createRazorpayOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    return this.paymentsService.createRazorpayOrder(req.user.userId, orderId);
  }

  @Roles(UserRole.CUSTOMER)
  @Post('razorpay/verify')
  async verifyRazorpayPayment(
    @Body() dto: VerifyRazorpayPaymentDto,
    @Request() req,
  ) {
    return this.paymentsService.verifyRazorpayPayment(req.user.userId, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/summary')
  async getSummary() {
    return this.paymentsService.getAdminSummary();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/transactions')
  async getTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || limit < 1) {
      return { items: [], total: 0, page, limit };
    }
    return this.paymentsService.getAdminTransactions(page, limit);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/ledger')
  async getLedger(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || limit < 1) {
      return { items: [], total: 0, page, limit };
    }
    return this.paymentsService.getAdminLedger(page, limit);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/hotel-settlements')
  async getHotelSettlements(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || limit < 1) {
      return { items: [], total: 0, page, limit };
    }
    return this.paymentsService.getAdminHotelSettlements(page, limit);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/delivery-payouts')
  async getDeliveryPayouts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || limit < 1) {
      return { items: [], total: 0, page, limit };
    }
    return this.paymentsService.getAdminDeliveryPayouts(page, limit);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/refunds')
  async getRefunds(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || limit < 1) {
      return { items: [], total: 0, page, limit };
    }
    return this.paymentsService.getAdminRefunds(page, limit);
  }

  // --- ACTIONS ENDPOINTS FOR SIMULATION & TESTING ---

  @Roles(UserRole.SUPER_ADMIN, UserRole.CUSTOMER)
  @Post('admin/payment-attempts')
  async createPaymentAttempt(@Body() dto: CreatePaymentAttemptDto) {
    return this.paymentsService.createPaymentAttempt(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/payments/:id/capture')
  async capturePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CapturePaymentDto,
  ) {
    return this.paymentsService.capturePayment(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/payments/:id/refund')
  async refundPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/settle-hotels')
  async settleHotels() {
    return this.paymentsService.processHotelSettlements();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/payout-drivers')
  async payoutDrivers() {
    return this.paymentsService.processDeliveryPayouts();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/hotel-settlements/:id/fail')
  async failSettlement(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.failHotelSettlement(id, reason);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/hotel-settlements/:id/complete')
  async completeSettlement(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.completeHotelSettlement(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/hotel-settlements/:id/retry')
  async retrySettlement(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.retryHotelSettlement(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-payouts/:id/fail')
  async failPayout(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.failDeliveryPartnerPayout(id, reason);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-payouts/:id/complete')
  async completePayout(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.completeDeliveryPartnerPayout(id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-payouts/:id/retry')
  async retryPayout(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.retryDeliveryPartnerPayout(id);
  }
}
