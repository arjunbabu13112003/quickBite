import { IsNotEmpty, IsString, IsEmail, MinLength, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { VehicleType } from '../enums/vehicle-type.enum';
import { DeliveryType } from '../enums/delivery-type.enum';

export class AdminCreateDeliveryPartnerDto {
  @IsNotEmpty({ message: 'fullName is required' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsNotEmpty({ message: 'mobileNumber is required' })
  @IsString()
  mobileNumber: string;

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(100)
  email: string;

  @IsNotEmpty({ message: 'temporaryPassword is required' })
  @IsString()
  @MinLength(8, { message: 'temporaryPassword must be at least 8 characters' })
  temporaryPassword: string;

  @IsNotEmpty({ message: 'vehicleType is required' })
  @IsEnum(VehicleType, { message: 'vehicleType must be BIKE, SCOOTER, BICYCLE, or CAR' })
  vehicleType: VehicleType;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  driversLicenseNumber?: string;

  @IsNotEmpty({ message: 'preferredZone is required' })
  @IsString()
  preferredZone: string;

  @IsOptional()
  @IsString()
  secondaryZone?: string;

  @IsNotEmpty({ message: 'deliveryType is required' })
  @IsEnum(DeliveryType, { message: 'deliveryType must be FULL_TIME or PART_TIME' })
  deliveryType: DeliveryType;

  @IsNotEmpty({ message: 'accountHolderName is required' })
  @IsString()
  @MaxLength(100)
  accountHolderName: string;

  @IsNotEmpty({ message: 'bankAccountNumber is required' })
  @IsString()
  bankAccountNumber: string;

  @IsNotEmpty({ message: 'confirmBankAccountNumber is required' })
  @IsString()
  confirmBankAccountNumber: string;

  @IsNotEmpty({ message: 'ifscCode is required' })
  @IsString()
  ifscCode: string;

  @IsOptional()
  @IsString()
  upiId?: string;
}
