import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CapturePaymentDto {
  @IsString()
  @IsNotEmpty()
  providerPaymentId: string;

  @IsString()
  @IsOptional()
  providerSignature?: string;
}
