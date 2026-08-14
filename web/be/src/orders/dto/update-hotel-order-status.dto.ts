import { IsNotEmpty, IsIn } from 'class-validator';

export class UpdateHotelOrderStatusDto {
  @IsNotEmpty()
  @IsIn(['accepted', 'rejected', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'], {
    message:
      'status must be one of: accepted, rejected, preparing, ready_for_pickup, out_for_delivery, delivered, cancelled',
  })
  status: string;
}
