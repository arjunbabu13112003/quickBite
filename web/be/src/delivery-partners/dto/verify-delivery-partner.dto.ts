import { IsBoolean, IsNotEmpty } from 'class-validator';

export class VerifyDeliveryPartnerDto {
  @IsNotEmpty()
  @IsBoolean()
  isVerified: boolean;
}
