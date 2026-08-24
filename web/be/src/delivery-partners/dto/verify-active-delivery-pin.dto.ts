import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyActiveDeliveryPinDto {
  @IsNotEmpty()
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
