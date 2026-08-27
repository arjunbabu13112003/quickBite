import { IsNotEmpty, IsString, Length, IsOptional, IsNumber } from 'class-validator';

export class VerifyActiveDeliveryPinDto {
  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @IsOptional()
  @IsNumber()
  bypassLatitude?: number;

  @IsOptional()
  @IsNumber()
  bypassLongitude?: number;

  @IsOptional()
  @IsNumber()
  bypassDistance?: number;

  @IsOptional()
  @IsString()
  bypassTimestamp?: string;
}
