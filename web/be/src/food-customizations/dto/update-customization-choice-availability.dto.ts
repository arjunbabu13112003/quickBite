import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCustomizationChoiceAvailabilityDto {
  @IsNotEmpty()
  @IsBoolean()
  isAvailable: boolean;
}
