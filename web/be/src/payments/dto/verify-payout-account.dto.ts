import { IsString, IsOptional } from 'class-validator';

export class VerifyPayoutAccountDto {
  @IsOptional()
  @IsString()
  verificationNote?: string;
}
