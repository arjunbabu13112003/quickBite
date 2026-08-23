import { IsNotEmpty, IsString } from 'class-validator';

export class DeliveryPartnerLoginDto {
  @IsNotEmpty({ message: 'Identifier (email or mobile) is required' })
  @IsString()
  identifier: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}
