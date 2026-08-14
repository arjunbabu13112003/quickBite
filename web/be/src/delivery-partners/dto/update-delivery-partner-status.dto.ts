import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDeliveryPartnerStatusDto {
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
