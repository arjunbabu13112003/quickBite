import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHotelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^(?!\s*$).+/, { message: 'name must not be empty or whitespace-only' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[+]?[0-9\s-]{7,20}$/, { message: 'phoneNumber must contain only digits, spaces, dashes or plus signs' })
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?!\s*$).+/, { message: 'address must not be empty or whitespace-only' })
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^(?!\s*$).+/, { message: 'city must not be empty or whitespace-only' })
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?!\s*$).+/, { message: 'area must not be empty or whitespace-only' })
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(?!\s*$).+/, { message: 'state must not be empty or whitespace-only' })
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\d{6}$/, { message: 'pincode must be a valid 6-digit Indian pincode' })
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryTimeMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ValidateIf((o) => o.deliveryTimeMin !== undefined && o.deliveryTimeMax !== undefined)
  @Min(0)
  deliveryTimeMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryRadiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;

  @IsOptional()
  @IsBoolean()
  isPureVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fssaiNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  openingTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  closingTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averagePreparationTime?: number;

  @IsOptional()
  @IsBoolean()
  supportsCOD?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsOnlinePayment?: boolean;
}
