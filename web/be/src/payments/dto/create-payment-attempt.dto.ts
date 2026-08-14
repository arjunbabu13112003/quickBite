import { IsInt, Min, IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentAttemptDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
