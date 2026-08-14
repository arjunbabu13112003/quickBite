import { IsInt, Min, IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateDeliveryPartnerDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^\d{10}$/, { message: 'phoneNumber must contain exactly 10 digits' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?!\s*$).+/, { message: 'vehicleType must not be empty or whitespace-only' })
  vehicleType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^(?!\s*$).+/, { message: 'vehicleNumber must not be empty or whitespace-only' })
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?!\s*$).+/, { message: 'licenseNumber must not be empty or whitespace-only' })
  licenseNumber?: string;
}
