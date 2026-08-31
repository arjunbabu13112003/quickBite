import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
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
import { PartnerEarning } from './entities/partner-earning.entity';
import { PartnerWalletAdjustment } from './entities/partner-wallet-adjustment.entity';
import { PartnerSettlement } from './entities/partner-settlement.entity';
import { PartnerSettlementItem } from './entities/partner-settlement-item.entity';
import { PartnerCodTransaction } from './entities/partner-cod-transaction.entity';
import { PartnerCodRemittance } from './entities/partner-cod-remittance.entity';
import { PartnerPayoutAccount } from './entities/partner-payout-account.entity';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { OffersModule } from '../offers/offers.module';
import { BankEncryptionService } from '../delivery-partners/bank-encryption.service';

@Module({
  imports: [
    OffersModule,
    TypeOrmModule.forFeature([
      Payment,
      OrderFinancialAllocation,
      LedgerEntry,
      HotelSettlement,
      DeliveryPartnerPayout,
      RecipientAccount,
      Refund,
      PaymentWebhookEvent,
      Order,
      Hotel,
      DeliveryPartner,
      DeliveryAssignment,
      PartnerEarning,
      PartnerWalletAdjustment,
      PartnerSettlement,
      PartnerSettlementItem,
      PartnerCodTransaction,
      PartnerCodRemittance,
      PartnerPayoutAccount,
    ]),
  ],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, RazorpayGateway, BankEncryptionService],
  exports: [PaymentsService, RazorpayGateway, BankEncryptionService],
})
export class PaymentsModule {}

