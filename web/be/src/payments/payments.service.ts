import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { OrderFinancialAllocation } from './entities/order-financial-allocation.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { HotelSettlement } from './entities/hotel-settlement.entity';
import { DeliveryPartnerPayout } from './entities/delivery-partner-payout.entity';
import { RecipientAccount } from './entities/recipient-account.entity';
import { Refund } from './entities/refund.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Order } from '../orders/order.entity';
import { Hotel } from '../hotels/hotel.entity';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';
import { DeliveryAssignment } from '../delivery-partners/delivery-assignment.entity';
import { Cart } from '../cart/cart.entity';
import { CartItem } from '../cart/cart-item.entity';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { PaymentAttemptStatus } from './enums/payment-attempt-status.enum';
import { LedgerEntryType } from './enums/ledger-entry-type.enum';
import { AccountType } from './enums/account-type.enum';
import { Direction } from './enums/direction.enum';
import { SettlementStatus } from './enums/settlement-status.enum';
import { PayoutStatus } from './enums/payout-status.enum';
import { RefundStatus } from './enums/refund-status.enum';
import { CreatePaymentAttemptDto } from './dto/create-payment-attempt.dto';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { OffersService } from '../offers/offers.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(OrderFinancialAllocation)
    private readonly allocationRepository: Repository<OrderFinancialAllocation>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    @InjectRepository(HotelSettlement)
    private readonly settlementRepository: Repository<HotelSettlement>,
    @InjectRepository(DeliveryPartnerPayout)
    private readonly payoutRepository: Repository<DeliveryPartnerPayout>,
    @InjectRepository(RecipientAccount)
    private readonly recipientRepository: Repository<RecipientAccount>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
    @InjectRepository(DeliveryPartner)
    private readonly partnerRepository: Repository<DeliveryPartner>,
    @InjectRepository(PaymentWebhookEvent)
    private readonly webhookEventRepository: Repository<PaymentWebhookEvent>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly razorpayGateway: RazorpayGateway,
    private readonly offersService: OffersService,
  ) {}

  getPaymentConfig() {
    const hotelCommissionRate = Number(this.configService.get<string>('PLATFORM_COMMISSION_RATE', '0.10'));
    const deliveryPartnerEarningRate = Number(this.configService.get<string>('DELIVERY_PARTNER_EARNING_RATE', '1.00'));
    const taxOwner = this.configService.get<string>('PAYMENT_TAX_OWNER', 'hotel');
    const discountAbsorbedBy = this.configService.get<string>('PAYMENT_DISCOUNT_ABSORBED_BY', 'hotel');

    return {
      hotelCommissionRate,
      deliveryPartnerEarningRate,
      taxOwner,
      discountAbsorbedBy,
    };
  }

  calculatePartnerEarning(deliveryFee: number): number {
    const config = this.getPaymentConfig();
    const deliveryFeePaise = Math.round(Number(deliveryFee || 0) * 100);
    const deliveryPartnerEarningPaise = Math.round(deliveryFeePaise * config.deliveryPartnerEarningRate);
    return deliveryPartnerEarningPaise / 100;
  }

  async createPaymentAttempt(dto: CreatePaymentAttemptDto): Promise<Payment> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    const providerPaymentId = 'pay_sim_' + Math.random().toString(36).substring(2, 15);
    const providerOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      amount: order.totalAmount,
      currency: 'INR',
      paymentMethod: dto.paymentMethod,
      status: PaymentAttemptStatus.CREATED,
      provider: dto.paymentMethod === 'cod' ? 'cod' : 'razorpay',
      providerOrderId,
      providerPaymentId,
    });

    return await this.paymentRepository.save(payment);
  }

  async capturePayment(paymentId: number, dto: CapturePaymentDto): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment attempt with ID ${paymentId} not found`);
    }

    if (payment.status === PaymentAttemptStatus.PAID) {
      return payment; // Idempotent guard
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Mark payment as paid
      payment.status = PaymentAttemptStatus.PAID;
      payment.providerPaymentId = dto.providerPaymentId;
      payment.providerSignature = dto.providerSignature;
      payment.paidAt = new Date();
      const savedPayment = await manager.save(Payment, payment);

      // 2. Sync order payment status
      const order = await manager.findOne(Order, {
        where: { id: payment.orderId },
      });
      if (order) {
        order.paymentStatus = 'paid';
        await manager.save(Order, order);

        // 3. Finalize allocation if order is delivered
        await this.checkAndFinalizeOrderAllocationInternal(order.id, savedPayment, manager);
      }

      return savedPayment;
    });
  }

  async refundPayment(paymentId: number, dto: RefundPaymentDto & { providerRefundId?: string }): Promise<Refund> {
    return await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException(`Payment attempt with ID ${paymentId} not found`);
      }

      if (payment.status !== PaymentAttemptStatus.PAID && payment.status !== PaymentAttemptStatus.PARTIALLY_REFUNDED) {
        throw new BadRequestException('Can only refund a paid or partially refunded payment');
      }

      // 1. Idempotency Check
      if (dto.providerRefundId) {
        const existingRefund = await manager.findOne(Refund, {
          where: { providerRefundId: dto.providerRefundId },
        });
        if (existingRefund) {
          return existingRefund;
        }
      }

      // 2. Sum existing successful refunds in integer paise
      const existingRefunds = await manager.find(Refund, {
        where: { paymentId: payment.id, status: RefundStatus.PROCESSED },
      });
      const totalRefundedPaise = existingRefunds.reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0);
      const paymentAmountPaise = Math.round(Number(payment.amount) * 100);
      const requestAmountPaise = Math.round(Number(dto.amount) * 100);

      if (totalRefundedPaise + requestAmountPaise > paymentAmountPaise) {
        throw new BadRequestException(
          `Refund amount exceeds remaining refundable balance. Total refunded: ${(totalRefundedPaise / 100).toFixed(2)}, Paid: ${(paymentAmountPaise / 100).toFixed(2)}`
        );
      }

      // 3. Create Refund Record
      const providerRefundId = dto.providerRefundId || 're_' + Math.random().toString(36).substring(2, 15);
      const refund = manager.create(Refund, {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: dto.amount,
        currency: 'INR',
        status: RefundStatus.PROCESSED,
        provider: payment.paymentMethod === 'cod' ? 'manual' : 'razorpay',
        providerRefundId,
        reason: dto.reason || 'None provided',
        processedAt: new Date(),
      });
      const savedRefund = await manager.save(Refund, refund);

      // 4. Update Payment status (PARTIALLY_REFUNDED or REFUNDED)
      const newTotalRefundedPaise = totalRefundedPaise + requestAmountPaise;
      if (newTotalRefundedPaise === paymentAmountPaise) {
        payment.status = PaymentAttemptStatus.REFUNDED;
        payment.refundedAt = new Date();
      } else {
        payment.status = PaymentAttemptStatus.PARTIALLY_REFUNDED;
      }
      await manager.save(Payment, payment);

      // 5. Write double-entry ledger adjustment (debit platform refund)
      const ledgerEntry = manager.create(LedgerEntry, {
        entryType: LedgerEntryType.REFUND,
        orderId: payment.orderId,
        paymentId: payment.id,
        accountType: AccountType.PLATFORM,
        direction: Direction.DEBIT,
        amount: dto.amount,
        currency: 'INR',
        description: `Refund processed for Order #${payment.orderId}. Provider Refund ID: ${providerRefundId}`,
      });
      await manager.save(LedgerEntry, ledgerEntry);

      return savedRefund;
    });
  }

  async checkAndFinalizeOrderAllocation(orderId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) return;

      const successfulPayment = await manager.findOne(Payment, {
        where: { orderId: order.id, status: PaymentAttemptStatus.PAID },
      });

      await this.checkAndFinalizeOrderAllocationInternal(orderId, successfulPayment, manager);
    });
  }

  private async checkAndFinalizeOrderAllocationInternal(
    orderId: number,
    payment: Payment | null,
    manager: EntityManager,
  ): Promise<void> {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      relations: ['hotel'],
    });

    if (!order) return;

    // Rule: Finalize ONLY if order is both delivered and paid
    if (order.orderStatus !== 'delivered' || order.paymentStatus !== 'paid') {
      return;
    }

    // Check if allocation already exists (idempotency guard)
    const existing = await manager.findOne(OrderFinancialAllocation, {
      where: { orderId },
    });
    if (existing) return;

    const config = this.getPaymentConfig();

    // Money Precision using Paise integers
    const subtotalPaise = Math.round(Number(order.subtotal) * 100);
    const deliveryFeePaise = Math.round(Number(order.deliveryFee) * 100);
    const taxAmountPaise = Math.round(Number(order.taxAmount) * 100);
    const discountAmountPaise = Math.round(Number(order.discountAmount) * 100);
    const grossAmountPaise = Math.round(Number(order.totalAmount) * 100);

    // Business Logic Allocations
    const hotelCommissionPaise = Math.round(subtotalPaise * config.hotelCommissionRate);
    const hotelGrossPaise = subtotalPaise + taxAmountPaise;
    const hotelNetPaise = hotelGrossPaise - hotelCommissionPaise - discountAmountPaise;

    const deliveryPartnerEarningPaise = Math.round(deliveryFeePaise * config.deliveryPartnerEarningRate);
    const platformEarningPaise = hotelCommissionPaise;

    // Save allocation with historical rates
    const allocation = manager.create(OrderFinancialAllocation, {
      orderId: order.id,
      grossAmount: order.totalAmount,
      hotelGrossAmount: hotelGrossPaise / 100,
      hotelCommissionAmount: hotelCommissionPaise / 100,
      hotelNetAmount: hotelNetPaise / 100,
      deliveryPartnerEarning: deliveryPartnerEarningPaise / 100,
      platformEarning: platformEarningPaise / 100,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      deliveryFee: order.deliveryFee,
      appliedHotelCommissionRate: config.hotelCommissionRate,
      appliedDeliveryPartnerEarningRate: config.deliveryPartnerEarningRate,
    });
    await manager.save(OrderFinancialAllocation, allocation);

    // Write Ledger Entries (Credits / Debits)
    // 1. Platform Account Earning credit
    await manager.save(LedgerEntry, manager.create(LedgerEntry, {
      entryType: LedgerEntryType.PLATFORM_COMMISSION,
      orderId: order.id,
      paymentId: payment?.id,
      accountType: AccountType.PLATFORM,
      direction: Direction.CREDIT,
      amount: platformEarningPaise / 100,
      description: `Platform ${(config.hotelCommissionRate * 100).toFixed(0)}% commission on subtotal for Order #${order.id}`,
    }));

    // 2. Hotel Account Credit (Hotel Gross earning)
    await manager.save(LedgerEntry, manager.create(LedgerEntry, {
      entryType: LedgerEntryType.HOTEL_PAYABLE,
      orderId: order.id,
      paymentId: payment?.id,
      hotelId: order.hotelId,
      accountType: AccountType.HOTEL,
      direction: Direction.CREDIT,
      amount: hotelGrossPaise / 100,
      description: `Hotel gross earnings (subtotal + tax) for Order #${order.id}`,
    }));

    // 3. Hotel Account Commission Debit
    await manager.save(LedgerEntry, manager.create(LedgerEntry, {
      entryType: LedgerEntryType.PLATFORM_COMMISSION,
      orderId: order.id,
      paymentId: payment?.id,
      hotelId: order.hotelId,
      accountType: AccountType.HOTEL,
      direction: Direction.DEBIT,
      amount: hotelCommissionPaise / 100,
      description: `Platform commission debit for Order #${order.id}`,
    }));

    // 4. Hotel Account Discount Debit
    if (discountAmountPaise > 0) {
      await manager.save(LedgerEntry, manager.create(LedgerEntry, {
        entryType: LedgerEntryType.ADJUSTMENT,
        orderId: order.id,
        paymentId: payment?.id,
        hotelId: order.hotelId,
        accountType: AccountType.HOTEL,
        direction: Direction.DEBIT,
        amount: discountAmountPaise / 100,
        description: `Promo discount deduction for Order #${order.id}`,
      }));
    }

    // 5. Delivery Partner Earning Credit (if partner assignment exists)
    const assignmentRepository = manager.getRepository('DeliveryAssignment');
    const assignment = await assignmentRepository.findOne({
      where: { orderId: order.id, deliveryPartnerId: order.deliveryPartnerId },
      relations: ['deliveryPartner'],
    }) as any;

    if (assignment && assignment.deliveryPartner) {
      await manager.save(LedgerEntry, manager.create(LedgerEntry, {
        entryType: LedgerEntryType.DELIVERY_PARTNER_PAYABLE,
        orderId: order.id,
        paymentId: payment?.id,
        deliveryPartnerId: assignment.deliveryPartnerId,
        accountType: AccountType.DELIVERY_PARTNER,
        direction: Direction.CREDIT,
        amount: deliveryPartnerEarningPaise / 100,
        description: `Delivery fee earnings for Order #${order.id}`,
      }));
    }

    // 6. Customer cash input record
    await manager.save(LedgerEntry, manager.create(LedgerEntry, {
      entryType: LedgerEntryType.CUSTOMER_PAYMENT,
      orderId: order.id,
      paymentId: payment?.id,
      accountType: AccountType.PLATFORM,
      direction: Direction.DEBIT,
      amount: order.totalAmount,
      description: `Customer payment received for Order #${order.id}`,
    }));
  }

  async processHotelSettlements(): Promise<HotelSettlement[]> {
    return await this.dataSource.transaction(async (manager) => {
      // Find all ledger entries for hotels that are not settled yet
      const query = manager.createQueryBuilder(LedgerEntry, 'le')
        .where('le.hotelId IS NOT NULL')
        .andWhere('le.hotelSettlementId IS NULL');

      const entries = await query.getMany();
      if (entries.length === 0) return [];

      // Group ledger entries by hotelId
      const hotelEntriesMap = new Map<number, LedgerEntry[]>();
      entries.forEach((e) => {
        const list = hotelEntriesMap.get(e.hotelId!) || [];
        list.push(e);
        hotelEntriesMap.set(e.hotelId!, list);
      });

      const settlements: HotelSettlement[] = [];

      for (const [hotelId, hotelEntries] of hotelEntriesMap.entries()) {
        // Sum total net payable in paise (credit is positive, debit is negative)
        let totalNetPaise = 0;
        hotelEntries.forEach((e) => {
          const paise = Math.round(Number(e.amount) * 100);
          if (e.direction === Direction.CREDIT) {
            totalNetPaise += paise;
          } else {
            totalNetPaise -= paise;
          }
        });

        if (totalNetPaise > 0) {
          const providerTransferId = 'trsf_' + Math.random().toString(36).substring(2, 15);
          
          // Create settlement record (Starts as PENDING)
          const settlement = manager.create(HotelSettlement, {
            hotelId,
            amount: totalNetPaise / 100,
            currency: 'INR',
            status: SettlementStatus.PENDING,
            providerTransferId,
          });
          const savedSettlement = await manager.save(HotelSettlement, settlement);

          // Update ledger entries to link to settlement
          for (const e of hotelEntries) {
            e.hotelSettlementId = savedSettlement.id;
            await manager.save(LedgerEntry, e);
          }

          settlements.push(savedSettlement);
        }
      }

      return settlements;
    });
  }

  async processDeliveryPayouts(): Promise<DeliveryPartnerPayout[]> {
    return await this.dataSource.transaction(async (manager) => {
      // Find all delivery partner ledger entries not payout linked
      const query = manager.createQueryBuilder(LedgerEntry, 'le')
        .where('le.deliveryPartnerId IS NOT NULL')
        .andWhere('le.deliveryPartnerPayoutId IS NULL');

      const entries = await query.getMany();
      if (entries.length === 0) return [];

      const partnerEntriesMap = new Map<number, LedgerEntry[]>();
      entries.forEach((e) => {
        const list = partnerEntriesMap.get(e.deliveryPartnerId!) || [];
        list.push(e);
        partnerEntriesMap.set(e.deliveryPartnerId!, list);
      });

      const payouts: DeliveryPartnerPayout[] = [];

      for (const [partnerId, partnerEntries] of partnerEntriesMap.entries()) {
        let totalNetPaise = 0;
        partnerEntries.forEach((e) => {
          const paise = Math.round(Number(e.amount) * 100);
          if (e.direction === Direction.CREDIT) {
            totalNetPaise += paise;
          } else {
            totalNetPaise -= paise;
          }
        });

        if (totalNetPaise > 0) {
          const providerPayoutId = 'payout_' + Math.random().toString(36).substring(2, 15);

          // Create payout record (Starts as PENDING)
          const payout = manager.create(DeliveryPartnerPayout, {
            deliveryPartnerId: partnerId,
            amount: totalNetPaise / 100,
            currency: 'INR',
            status: PayoutStatus.PENDING,
            providerPayoutId,
          });
          const savedPayout = await manager.save(DeliveryPartnerPayout, payout);

          for (const e of partnerEntries) {
            e.deliveryPartnerPayoutId = savedPayout.id;
            await manager.save(LedgerEntry, e);
          }

          payouts.push(savedPayout);
        }
      }

      return payouts;
    });
  }

  // --- RETRY SYSTEM ACTIONS (OPTION A) ---

  async completeHotelSettlement(settlementId: number): Promise<HotelSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });
    if (!settlement) {
      throw new NotFoundException(`Hotel settlement with ID ${settlementId} not found`);
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Settlement is already completed');
    }

    settlement.status = SettlementStatus.COMPLETED;
    settlement.processedAt = new Date();
    settlement.failureReason = undefined;

    return await this.settlementRepository.save(settlement);
  }

  async failHotelSettlement(settlementId: number, reason?: string): Promise<HotelSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });
    if (!settlement) {
      throw new NotFoundException(`Hotel settlement with ID ${settlementId} not found`);
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Cannot fail a completed settlement');
    }

    settlement.status = SettlementStatus.FAILED;
    settlement.failureReason = reason || 'Simulated gateway failure';

    return await this.settlementRepository.save(settlement);
  }

  async retryHotelSettlement(settlementId: number): Promise<HotelSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });
    if (!settlement) {
      throw new NotFoundException(`Hotel settlement with ID ${settlementId} not found`);
    }

    if (settlement.status === SettlementStatus.COMPLETED) {
      throw new BadRequestException('Settlement is already completed and cannot be retried');
    }

    settlement.status = SettlementStatus.COMPLETED;
    settlement.attemptCount += 1;
    settlement.lastAttemptAt = new Date();
    settlement.processedAt = new Date();
    settlement.failureReason = undefined;

    return await this.settlementRepository.save(settlement);
  }

  async completeDeliveryPartnerPayout(payoutId: number): Promise<DeliveryPartnerPayout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Delivery partner payout with ID ${payoutId} not found`);
    }

    if (payout.status === PayoutStatus.COMPLETED) {
      throw new BadRequestException('Payout is already completed');
    }

    payout.status = PayoutStatus.COMPLETED;
    payout.processedAt = new Date();
    payout.failureReason = undefined;

    return await this.payoutRepository.save(payout);
  }

  async failDeliveryPartnerPayout(payoutId: number, reason?: string): Promise<DeliveryPartnerPayout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Delivery partner payout with ID ${payoutId} not found`);
    }

    if (payout.status === PayoutStatus.COMPLETED) {
      throw new BadRequestException('Cannot fail a completed payout');
    }

    payout.status = PayoutStatus.FAILED;
    payout.failureReason = reason || 'Simulated gateway failure';

    return await this.payoutRepository.save(payout);
  }

  async retryDeliveryPartnerPayout(payoutId: number): Promise<DeliveryPartnerPayout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });
    if (!payout) {
      throw new NotFoundException(`Delivery partner payout with ID ${payoutId} not found`);
    }

    if (payout.status === PayoutStatus.COMPLETED) {
      throw new BadRequestException('Payout is already completed and cannot be retried');
    }

    payout.status = PayoutStatus.COMPLETED;
    payout.attemptCount += 1;
    payout.lastAttemptAt = new Date();
    payout.processedAt = new Date();
    payout.failureReason = undefined;

    return await this.payoutRepository.save(payout);
  }

  // --- SUPER_ADMIN API METRIC METHODS ---

  async getAdminSummary(): Promise<any> {
    const payments = await this.paymentRepository.find({
      where: { status: PaymentAttemptStatus.PAID },
    });
    const allocations = await this.allocationRepository.find();
    const settlements = await this.settlementRepository.find({
      where: { status: SettlementStatus.COMPLETED },
    });
    const payouts = await this.payoutRepository.find({
      where: { status: PayoutStatus.COMPLETED },
    });

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPlatformCommission = allocations.reduce((sum, a) => sum + Number(a.platformEarning), 0);
    const totalHotelSettled = settlements.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalDeliveryPaid = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalCollected,
      totalPlatformCommission,
      totalHotelSettled,
      totalDeliveryPaid,
      countPaidPayments: payments.length,
      countAllocatedOrders: allocations.length,
    };
  }

  async getAdminTransactions(page: number, limit: number): Promise<any> {
    const [items, total] = await this.paymentRepository.findAndCount({
      relations: ['order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Append refund details and COD collection metadata for Super Admin
    const processedItems = await Promise.all(
      items.map(async (payment) => {
        const refunds = await this.refundRepository.find({
          where: { paymentId: payment.id, status: RefundStatus.PROCESSED },
        });
        const refundedAmount = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
        const remainingRefundable = Number(payment.amount) - refundedAmount;

        // COD collection audit metadata (sourced from Order, not Payment, to stay authoritative)
        const codMeta = payment.paymentMethod?.toLowerCase() === 'cod'
          ? {
              isCod: true,
              cashCollectedAt: payment.order?.cashCollectedAt ?? null,
              cashCollectedByDeliveryPartnerId:
                payment.order?.cashCollectedByDeliveryPartnerId ?? null,
              codCashInPlatformBank: false, // Always false — cash is held by driver until remittance
            }
          : { isCod: false };

        return {
          ...payment,
          refundedAmount,
          remainingRefundable,
          refunds,
          ...codMeta,
        };
      })
    );

    return { items: processedItems, total, page, limit };
  }

  async getAdminLedger(page: number, limit: number): Promise<any> {
    const [items, total] = await this.ledgerRepository.findAndCount({
      relations: ['order', 'hotel', 'deliveryPartner'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getAdminHotelSettlements(page: number, limit: number): Promise<any> {
    const [items, total] = await this.settlementRepository.findAndCount({
      relations: ['hotel'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getAdminDeliveryPayouts(page: number, limit: number): Promise<any> {
    const [items, total] = await this.payoutRepository.findAndCount({
      relations: ['deliveryPartner', 'deliveryPartner.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getAdminRefunds(page: number, limit: number): Promise<any> {
    const [items, total] = await this.refundRepository.findAndCount({
      relations: ['payment', 'order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
  /**
   * COD Cash Collection — called by the assigned delivery partner after physically collecting cash.
   *
   * Authorization flow:
   *   JWT (userId) → DeliveryPartner.userId → DeliveryAssignment.deliveryPartnerId → Order
   *
   * Idempotency: If cash was already collected for this order, returns the existing result.
   *
   * COD ledger accounting:
   *   The driver physically holds the cash. This is NOT a QuickBite bank receipt.
   *   We therefore credit DELIVERY_PARTNER_CASH_HELD, not PLATFORM, to avoid falsely
   *   representing COD cash as a platform-bank-received amount.
   *   A future remittance/reconciliation step will transfer this to the platform account.
   */
  async collectCodCash(userId: number, orderId: number): Promise<any> {
    // Step 1: Resolve the delivery partner profile from the JWT user identity
    const partner = await this.dataSource.getRepository(DeliveryPartner).findOne({
      where: { userId },
    });
    if (!partner || !partner.isActive || !partner.isVerified) {
      throw new ForbiddenException(
        'Delivery partner profile not found, inactive, or unverified',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Step 2: Lock and re-read order inside transaction
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Step 3: Validate payment method
      if (order.paymentMethod?.toLowerCase() !== 'cod') {
        throw new BadRequestException(
          `Order #${orderId} is not a Cash on Delivery order`,
        );
      }

      // Step 4: Reject invalid order lifecycle states
      const rejectedStatuses = ['cancelled', 'rejected'];
      if (rejectedStatuses.includes(order.orderStatus?.toLowerCase())) {
        throw new BadRequestException(
          `Cannot collect COD for a ${order.orderStatus} order`,
        );
      }

      // Step 5: Verify the partner was assigned to this order
      const assignment = await manager.findOne(DeliveryAssignment, {
        where: { orderId, deliveryPartnerId: partner.id },
      }) as DeliveryAssignment | null;
      if (!assignment) {
        throw new ForbiddenException(
          'You are not authorized to collect COD for this order — no assignment found',
        );
      }

      // Step 6: Idempotency — if already collected, return existing result
      if (order.cashCollectedAt) {
        return {
          message: 'COD cash collection already recorded',
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          cashCollectedAt: order.cashCollectedAt,
          cashCollectedByDeliveryPartnerId: order.cashCollectedByDeliveryPartnerId,
          amount: parseFloat(order.totalAmount.toString()),
          currency: 'INR',
          alreadyProcessed: true,
        };
      }

      const now = new Date();
      const totalAmountRaw = parseFloat(order.totalAmount.toString());

      // Step 7: Create the authoritative COD Payment record
      //   - Amount sourced from Order.totalAmount (server-side, not client)
      //   - provider = 'cod', status = PAID
      //   - providerPaymentId generated server-side (NOT from client)
      const codProviderPaymentId = `cod_${orderId}_${now.getTime()}`;

      // Check if a COD payment record already exists (e.g. from a previous partial attempt)
      let codPayment = await manager.findOne(Payment, {
        where: { orderId, paymentMethod: 'cod' },
      });

      if (!codPayment) {
        codPayment = manager.create(Payment, {
          orderId,
          amount: totalAmountRaw,
          currency: 'INR',
          paymentMethod: 'cod',
          status: PaymentAttemptStatus.PAID,
          provider: 'cod',
          providerPaymentId: codProviderPaymentId,
          paidAt: now,
        });
        codPayment = await manager.save(Payment, codPayment);
      } else {
        // Update existing draft COD payment to PAID
        codPayment.status = PaymentAttemptStatus.PAID;
        codPayment.paidAt = now;
        if (!codPayment.providerPaymentId) {
          codPayment.providerPaymentId = codProviderPaymentId;
        }
        codPayment = await manager.save(Payment, codPayment);
      }

      // Step 8: Update Order — mark payment as paid and record collection metadata
      order.paymentStatus = 'paid';
      order.cashCollectedAt = now;
      order.cashCollectedByDeliveryPartnerId = partner.id;
      await manager.save(Order, order);

      // Step 9: Write COD cash ledger entry
      //   accountType = DELIVERY_PARTNER_CASH_HELD — the driver holds this cash.
      //   This is explicitly NOT AccountType.PLATFORM. The platform bank has NOT received this money.
      //   Future: a cash remittance step will debit DELIVERY_PARTNER_CASH_HELD and credit PLATFORM.
      await manager.save(
        LedgerEntry,
        manager.create(LedgerEntry, {
          entryType: LedgerEntryType.COD_CASH_COLLECTED,
          orderId: order.id,
          paymentId: codPayment.id,
          deliveryPartnerId: partner.id,
          accountType: AccountType.DELIVERY_PARTNER_CASH_HELD,
          direction: Direction.CREDIT,
          amount: totalAmountRaw,
          currency: 'INR',
          referenceType: 'DeliveryAssignment',
          referenceId: assignment.id,
          description:
            `COD cash of ₹${totalAmountRaw.toFixed(2)} collected by partner #${partner.id} for Order #${orderId}. ` +
            `IMPORTANT: Cash is held by driver, NOT yet in QuickBite bank account. Remittance pending.`,
        }),
      );

      // Step 10: Trigger financial allocation if order is also delivered
      // checkAndFinalizeOrderAllocationInternal checks delivered + paid internally
      await this.checkAndFinalizeOrderAllocationInternal(order.id, codPayment, manager);

      return {
        message: 'COD cash collection recorded',
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        cashCollectedAt: order.cashCollectedAt,
        cashCollectedByDeliveryPartnerId: order.cashCollectedByDeliveryPartnerId,
        amount: totalAmountRaw,
        currency: 'INR',
        allocationFinalized: order.orderStatus === 'delivered',
      };
    });
  }

  /**
   * Creates a Razorpay Order and persists a local Payment attempt.
   */
  async createRazorpayOrder(userId: number, orderId: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You are not authorized to pay for this order');
    }

    if (order.paymentMethod?.toLowerCase() === 'cod') {
      throw new BadRequestException('Cannot create online payment order for COD order');
    }

    const cancelledStatuses = ['cancelled', 'rejected'];
    if (cancelledStatuses.includes(order.orderStatus?.toLowerCase())) {
      throw new BadRequestException(`Cannot pay for a ${order.orderStatus} order`);
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }

    const totalAmount = Number(order.totalAmount);
    if (totalAmount <= 0) {
      throw new BadRequestException('Order amount must be greater than 0');
    }

    // Convert to integer paise
    const amountInPaise = Math.round(totalAmount * 100);

    // Reuse existing CREATED razorpay payment attempt if one exists
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        orderId: order.id,
        paymentMethod: 'online',
        provider: 'razorpay',
        status: PaymentAttemptStatus.CREATED,
      },
    });

    if (existingPayment && existingPayment.providerOrderId) {
      return {
        quickBiteOrderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: existingPayment.providerOrderId,
        amount: order.totalAmount,
        currency: 'INR',
        keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    }

    // Otherwise, create a new Razorpay Order on the gateway
    const razorpayOrder = await this.razorpayGateway.createOrder(amountInPaise, `QB-${order.id}`);

    // Create local Payment attempt
    const payment = this.paymentRepository.create({
      orderId: order.id,
      amount: order.totalAmount,
      currency: 'INR',
      paymentMethod: 'online',
      status: PaymentAttemptStatus.CREATED,
      provider: 'razorpay',
      providerOrderId: razorpayOrder.id,
    });

    await this.paymentRepository.save(payment);

    return {
      quickBiteOrderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: order.totalAmount,
      currency: 'INR',
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  /**
   * Verifies Razorpay signature and finalizes payment.
   */
  async verifyRazorpayPayment(
    userId: number,
    dto: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ): Promise<any> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    const isSignatureValid = this.razorpayGateway.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!isSignatureValid) {
      throw new BadRequestException('Invalid Razorpay signature');
    }

    const payment = await this.paymentRepository.findOne({
      where: { providerOrderId: razorpay_order_id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment attempt for Razorpay order ID ${razorpay_order_id} not found`);
    }

    const order = payment.order;
    if (!order) {
      throw new NotFoundException(`Order for payment attempt ${payment.id} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not own this order');
    }

    return await this.dataSource.transaction(async (manager) => {
      // Re-read and lock both Payment and Order rows to prevent race conditions
      const lockedPayment = await manager.findOne(Payment, {
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });

      const lockedOrder = await manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPayment || !lockedOrder) {
        throw new NotFoundException('Payment or Order row could not be locked');
      }

      // Idempotency: if already paid, return existing result safely
      if (lockedPayment.status === PaymentAttemptStatus.PAID) {
        // Clear cart items just in case it wasn't cleared in the initial successful attempt
        const userCart = await manager.findOne(Cart, { where: { userId } });
        if (userCart) {
          await manager.delete(CartItem, { cartId: userCart.id });
        }
        return {
          message: 'Payment verified and recorded successfully (idempotent)',
          quickBiteOrderId: lockedOrder.id,
          orderNumber: lockedOrder.orderNumber,
          paymentStatus: lockedOrder.paymentStatus,
          providerPaymentId: lockedPayment.providerPaymentId,
        };
      }

      // Ensure providerPaymentId is unique among PAID payments
      const existingPaidWithPaymentId = await manager.findOne(Payment, {
        where: { providerPaymentId: razorpay_payment_id, status: PaymentAttemptStatus.PAID },
      });
      if (existingPaidWithPaymentId) {
        throw new ConflictException(`Payment ID ${razorpay_payment_id} has already been used for another payment`);
      }

      // Update payment status
      lockedPayment.status = PaymentAttemptStatus.PAID;
      lockedPayment.providerPaymentId = razorpay_payment_id;
      lockedPayment.providerSignature = razorpay_signature;
      lockedPayment.paidAt = new Date();
      await manager.save(Payment, lockedPayment);

      // Update order payment status
      lockedOrder.paymentStatus = 'paid';
      await manager.save(Order, lockedOrder);

      // Clear cart items (since payment has succeeded)
      const userCart = await manager.findOne(Cart, { where: { userId } });
      if (userCart) {
        await manager.delete(CartItem, { cartId: userCart.id });
      }

      // Call financial finalization
      await this.checkAndFinalizeOrderAllocationInternal(lockedOrder.id, lockedPayment, manager);

      // Record successful coupon/offer redemption if order has a couponCode
      if (lockedOrder.couponCode) {
        await this.offersService.recordRedemption(lockedOrder.id, manager);
      }

      return {
        message: 'Payment verified and recorded successfully',
        quickBiteOrderId: lockedOrder.id,
        orderNumber: lockedOrder.orderNumber,
        paymentStatus: lockedOrder.paymentStatus,
        providerPaymentId: lockedPayment.providerPaymentId,
      };
    });
  }

  /**
   * Processes incoming Razorpay webhooks asynchronously for payment reconciliation.
   */
  async handleRazorpayWebhook(rawBody: string | Buffer, signature: string): Promise<any> {
    const crypto = require('crypto');
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Razorpay webhook secret is missing.');
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      throw new BadRequestException('Invalid webhook signature');
    }
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8'),
    );
    if (!isSignatureValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch (e) {
      throw new BadRequestException('Malformed JSON payload');
    }

    const eventType = payload.event;
    const providerEventId = payload.id || `evt_sim_${crypto.randomBytes(8).toString('hex')}`;
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    // Check duplicate webhook event
    const existingEvent = await this.webhookEventRepository.findOne({
      where: [{ providerEventId }, { payloadHash }],
    });

    if (existingEvent) {
      if (existingEvent.processingStatus === 'processed') {
        return {
          message: 'Webhook event already processed (idempotent)',
          eventId: existingEvent.id,
          providerEventId: existingEvent.providerEventId,
          processingStatus: existingEvent.processingStatus,
        };
      }
      // If it is pending or failed, we can re-try processing it.
    }

    // Save webhook event as pending/created
    const webhookEvent = this.webhookEventRepository.create({
      provider: 'razorpay',
      providerEventId,
      eventType,
      payloadHash,
      processingStatus: 'pending',
    });
    const savedEvent = await this.webhookEventRepository.save(webhookEvent);

    try {
      if (eventType === 'payment.captured') {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) {
          throw new BadRequestException('Missing payment entity in payload');
        }

        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;
        const amountInPaise = paymentEntity.amount;
        const currency = paymentEntity.currency;

        savedEvent.providerPaymentId = razorpayPaymentId;
        savedEvent.providerOrderId = razorpayOrderId;

        // Find payment attempt
        const payment = await this.paymentRepository.findOne({
          where: { providerOrderId: razorpayOrderId },
          relations: ['order'],
        });

        if (!payment) {
          throw new NotFoundException(`Payment attempt for Razorpay order ID ${razorpayOrderId} not found`);
        }

        const order = payment.order;
        if (!order) {
          throw new NotFoundException(`Order for payment attempt ${payment.id} not found`);
        }

        // Amount verification
        const expectedAmountInPaise = Math.round(Number(order.totalAmount) * 100);
        if (amountInPaise !== expectedAmountInPaise) {
          throw new BadRequestException(`Amount mismatch: expected ${expectedAmountInPaise} paise, got ${amountInPaise}`);
        }

        // Currency verification
        if (currency?.toUpperCase() !== 'INR') {
          throw new BadRequestException(`Currency mismatch: expected INR, got ${currency}`);
        }

        // Reconcile payment in transaction
        const txResult = await this.dataSource.transaction(async (manager) => {
          const lockedPayment = await manager.findOne(Payment, {
            where: { id: payment.id },
            lock: { mode: 'pessimistic_write' },
          });

          const lockedOrder = await manager.findOne(Order, {
            where: { id: order.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!lockedPayment || !lockedOrder) {
            throw new NotFoundException('Payment or Order row could not be locked');
          }

          // Check if already paid
          if (lockedPayment.status === PaymentAttemptStatus.PAID) {
            return { idempotent: true };
          }

          // Unique providerPaymentId check among PAID payments
          const existingPaidWithPaymentId = await manager.findOne(Payment, {
            where: { providerPaymentId: razorpayPaymentId, status: PaymentAttemptStatus.PAID },
          });
          if (existingPaidWithPaymentId) {
            throw new ConflictException(`Payment ID ${razorpayPaymentId} has already been used for another payment`);
          }

          // Update payment status
          lockedPayment.status = PaymentAttemptStatus.PAID;
          lockedPayment.providerPaymentId = razorpayPaymentId;
          lockedPayment.paidAt = new Date();
          await manager.save(Payment, lockedPayment);

          // Update order payment status
          lockedOrder.paymentStatus = 'paid';
          await manager.save(Order, lockedOrder);

          // Call financial finalization
          await this.checkAndFinalizeOrderAllocationInternal(lockedOrder.id, lockedPayment, manager);

          return { idempotent: false };
        });

        if (txResult && txResult.idempotent) {
          savedEvent.processingStatus = 'processed';
          savedEvent.processedAt = new Date();
          await this.webhookEventRepository.save(savedEvent);

          return {
            message: 'Webhook processed successfully (idempotent)',
            eventId: savedEvent.id,
            eventType,
            processingStatus: savedEvent.processingStatus,
          };
        }

      } else if (eventType === 'payment.failed') {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) {
          throw new BadRequestException('Missing payment entity in payload');
        }

        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;
        const failureReason = paymentEntity.error_description || paymentEntity.error_code || 'Payment failed';

        savedEvent.providerPaymentId = razorpayPaymentId;
        savedEvent.providerOrderId = razorpayOrderId;

        const payment = await this.paymentRepository.findOne({
          where: { providerOrderId: razorpayOrderId },
          relations: ['order'],
        });

        if (payment) {
          const order = payment.order;
          // A failed event must NEVER regress a successfully paid order
          if (order && order.paymentStatus !== 'paid') {
            await this.dataSource.transaction(async (manager) => {
              const lockedPayment = await manager.findOne(Payment, {
                where: { id: payment.id },
                lock: { mode: 'pessimistic_write' },
              });
              if (lockedPayment && lockedPayment.status !== PaymentAttemptStatus.PAID) {
                lockedPayment.status = PaymentAttemptStatus.FAILED;
                lockedPayment.failedAt = new Date();
                lockedPayment.failureReason = failureReason;
                await manager.save(Payment, lockedPayment);
              }
            });
          }
        }
      }

      // Mark webhook event as processed
      savedEvent.processingStatus = 'processed';
      savedEvent.processedAt = new Date();
      await this.webhookEventRepository.save(savedEvent);

      return {
        message: 'Webhook processed successfully',
        eventId: savedEvent.id,
        eventType,
        processingStatus: savedEvent.processingStatus,
      };

    } catch (error) {
      // Mark webhook event as failed
      savedEvent.processingStatus = 'failed';
      savedEvent.failureReason = error.message || error;
      await this.webhookEventRepository.save(savedEvent);

      throw error;
    }
  }
}

