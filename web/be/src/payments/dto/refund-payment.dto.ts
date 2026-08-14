import { IsNumber, Min, IsString, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
