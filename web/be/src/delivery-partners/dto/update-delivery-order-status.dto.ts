import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateDeliveryOrderStatusDto {
  @IsNotEmpty()
  @IsIn(['picked_up', 'out_for_delivery', 'delivered'], {
    message: 'status must be one of: picked_up, out_for_delivery, delivered',
  })
  status: string;

  @IsOptional()
  @IsString()
  deliveryPin?: string;
}
