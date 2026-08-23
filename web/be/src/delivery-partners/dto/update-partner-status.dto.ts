import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeliveryPartnerAccountStatus } from '../delivery-partner.entity';

export class UpdatePartnerStatusDto {
  @IsEnum(DeliveryPartnerAccountStatus, { message: 'status must be APPROVED, ACTION_REQUIRED, or SUSPENDED' })
  status: DeliveryPartnerAccountStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
