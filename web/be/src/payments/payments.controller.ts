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
import { PartnerWalletAdjustmentDirection } from './entities/partner-wallet-adjustment.entity';
import { PartnerSettlementStatus } from './entities/partner-settlement.entity';
import { PayoutAccountStatus } from './entities/partner-payout-account.entity';
import { VerifyPayoutAccountDto } from './dto/verify-payout-account.dto';

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

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/partner-wallets')
  async getAdminPartnerWallets(@Query('search') search?: string) {
    return this.paymentsService.getPartnerWallets(search);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/delivery-partners/:partnerId/wallet')
  async getAdminPartnerWallet(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.paymentsService.getWalletSummary(partnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/delivery-partners/:partnerId/earnings')
  async getAdminPartnerEarnings(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1 || limit < 1) {
      return { items: [], total: 0, page, limit };
    }
    return this.paymentsService.getEarningsByPartnerId(partnerId, page, limit);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/delivery-partners/:partnerId/settlements')
  async getAdminPartnerSettlements(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.paymentsService.getSettlementsByPartnerId(partnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/partner-settlements/:settlementId')
  async getAdminSettlementDetails(@Param('settlementId', ParseIntPipe) settlementId: number) {
    return this.paymentsService.getSettlementDetails(settlementId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-partners/:partnerId/settlements/preview')
  async getAdminSettlementPreview(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.paymentsService.getSettlementPreview(partnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-partners/:partnerId/settlements')
  async createAdminSettlement(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.paymentsService.createSettlement(partnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/partner-settlements/:settlementId/processing')
  async processAdminSettlement(@Param('settlementId', ParseIntPipe) settlementId: number) {
    return this.paymentsService.updateSettlementStatus(settlementId, PartnerSettlementStatus.PROCESSING);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/partner-settlements/:settlementId/paid')
  async markAdminSettlementPaid(@Param('settlementId', ParseIntPipe) settlementId: number) {
    return this.paymentsService.updateSettlementStatus(settlementId, PartnerSettlementStatus.PAID);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/partner-settlements/:settlementId/failed')
  async markAdminSettlementFailed(@Param('settlementId', ParseIntPipe) settlementId: number) {
    return this.paymentsService.updateSettlementStatus(settlementId, PartnerSettlementStatus.FAILED);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/partner-settlements/:settlementId/cancelled')
  async cancelAdminSettlement(@Param('settlementId', ParseIntPipe) settlementId: number) {
    return this.paymentsService.updateSettlementStatus(settlementId, PartnerSettlementStatus.CANCELLED);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-partners/:partnerId/wallet-adjustments')
  async createAdminWalletAdjustment(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Body('amount') amount: string,
    @Body('direction') direction: PartnerWalletAdjustmentDirection,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.paymentsService.createWalletAdjustment(partnerId, amount, direction, reason, req.user.userId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/delivery-partners/:partnerId/cod-remittances')
  async getAdminPartnerCodRemittances(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.paymentsService.getCodRemittances(partnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/delivery-partners/:partnerId/cod-remittances')
  async recordAdminPartnerCodRemittance(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Body('amount') amount: string,
    @Body('paymentMethod') paymentMethod: string,
    @Body('reference') reference: string,
    @Body('notes') notes: string,
    @Request() req,
  ) {
    return this.paymentsService.recordCodRemittance(
      partnerId,
      amount,
      paymentMethod,
      reference,
      notes,
      req.user.userId,
    );
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/payout-accounts')
  async getAdminPayoutAccounts(@Query('status') status?: PayoutAccountStatus) {
    return this.paymentsService.getAdminPayoutAccounts(status);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/delivery-partners/:partnerId/payout-accounts')
  async getAdminPartnerPayoutAccounts(@Param('partnerId', ParseIntPipe) partnerId: number) {
    return this.paymentsService.getPartnerPayoutAccountsForAdmin(partnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/payout-accounts/:id/verify')
  async verifyPayoutAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyPayoutAccountDto,
    @Request() req,
  ) {
    return this.paymentsService.verifyPayoutAccount(id, req.user.userId, dto.verificationNote);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/payout-accounts/:id/reject')
  async rejectPayoutAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body('verificationNote') note: string,
    @Request() req,
  ) {
    return this.paymentsService.rejectPayoutAccount(id, req.user.userId, note);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/payout-accounts/:id/disable')
  async disablePayoutAccountByAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.disablePayoutAccountByAdmin(id);
  }
}
