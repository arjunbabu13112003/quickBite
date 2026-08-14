import { IsInt, Min, Max, IsNotEmpty } from 'class-validator';

export class UpdateCartItemQuantityDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}
