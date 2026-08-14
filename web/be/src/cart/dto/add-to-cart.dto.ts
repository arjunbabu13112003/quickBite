import {
  IsInt,
  Min,
  Max,
  IsArray,
  IsOptional,
  ArrayUnique,
} from 'class-validator';

export class AddToCartDto {
  @IsInt()
  @Min(1)
  foodId: number;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  choiceIds?: number[];
}
