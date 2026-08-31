import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartner } from './delivery-partner.entity';
import { DeliveryPartnerDocument } from './delivery-partner-document.entity';
import { DeliveryPartnerBankDetails } from './delivery-partner-bank-details.entity';
import { DeliveryAssignment } from './delivery-assignment.entity';
import { DeliveryPartnerOnlineSession } from './delivery-partner-online-session.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { PasswordResetOtp } from '../users/password-reset-otp.entity';
import { PasswordResetSession } from '../users/password-reset-session.entity';
import { DeliveryPartnersService } from './delivery-partners.service';
import { DeliveryPartnersController, DeliveryPartnersLoginController } from './delivery-partners.controller';
import { DeliveryPartnerForgotPasswordController } from './delivery-partner-forgot-password.controller';
import { PaymentsModule } from '../payments/payments.module';
import { BankEncryptionService } from './bank-encryption.service';

import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryPartner,
      DeliveryPartnerDocument,
      DeliveryPartnerBankDetails,
      DeliveryAssignment,
      DeliveryPartnerOnlineSession,
      User,
      Order,
      PasswordResetOtp,
      PasswordResetSession,
    ]),
    PaymentsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [DeliveryPartnersController, DeliveryPartnersLoginController, DeliveryPartnerForgotPasswordController],
  providers: [DeliveryPartnersService, BankEncryptionService],
  exports: [DeliveryPartnersService, BankEncryptionService],
})
export class DeliveryPartnersModule {}
