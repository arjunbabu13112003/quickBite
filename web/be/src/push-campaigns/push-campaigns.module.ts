import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushCampaignsController } from './push-campaigns.controller';
import { PushCampaignsService } from './push-campaigns.service';
import { PushCampaign } from './push-campaign.entity';
import { PushCampaignRecipient } from './push-campaign-recipient.entity';
import { PushCampaignRun } from './push-campaign-run.entity';
import { User } from '../users/user.entity';
import { DevicePushToken } from '../users/device-push-token.entity';
import { Order } from '../orders/order.entity';
import { Address } from '../addresses/address.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushCampaign,
      PushCampaignRecipient,
      PushCampaignRun,
      User,
      DevicePushToken,
      Order,
      Address,
    ]),
    NotificationsModule,
  ],
  controllers: [PushCampaignsController],
  providers: [PushCampaignsService],
  exports: [PushCampaignsService],
})
export class PushCampaignsModule {}
