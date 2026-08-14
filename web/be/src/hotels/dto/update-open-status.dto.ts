import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOpenStatusDto {
  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsOrders?: boolean;
}
