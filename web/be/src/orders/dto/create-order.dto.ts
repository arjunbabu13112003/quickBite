import {
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  addressId: number;

  @IsEnum(PaymentMethod, {
    message: 'paymentMethod must be "cod" or "online"',
  })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
