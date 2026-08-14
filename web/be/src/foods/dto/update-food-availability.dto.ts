import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateFoodAvailabilityDto {
  @IsNotEmpty()
  @IsBoolean()
  isAvailable: boolean;
}
