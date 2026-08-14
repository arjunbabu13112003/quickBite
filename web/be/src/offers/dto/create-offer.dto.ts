import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsInt,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateOfferDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(['percentage', 'flat', 'free_delivery'])
  discountType: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderValue?: number;

  @IsOptional()
  @IsEnum(['all', 'categories', 'foods'])
  applicabilityType?: string;

  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usagePerCustomer?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  applicableCategoryIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  applicableFoodIds?: number[];
}
