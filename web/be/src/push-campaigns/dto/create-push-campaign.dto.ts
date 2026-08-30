import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class CreatePushCampaignDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  notificationImageUrl?: string;

  @IsNotEmpty()
  @IsString()
  targetAudience: string; // 'ALL_CUSTOMERS' | 'SELECTED_CUSTOMERS' | 'ACTIVE_CUSTOMERS' | 'ORDERED_BEFORE' | 'NOT_ORDERED_RECENTLY' | 'SELECTED_CITY'

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectedUserIds?: number[];

  @IsOptional()
  @IsString()
  selectedCity?: string;

  @IsNotEmpty()
  @IsString()
  tapAction: string; // 'HOME' | 'OFFERS' | 'CAMPAIGN' | 'RESTAURANT' | 'ORDERS'

  @IsOptional()
  @IsString()
  tapActionArgument?: string;

  @IsNotEmpty()
  @IsString()
  scheduleType: string; // 'NOW' | 'LATER'

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  repeatPattern?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  repeatDays?: string[];

  @IsOptional()
  @IsNumber()
  repeatInterval?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  sendTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  endDateType?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  endAfterSendsCount?: number;
}
