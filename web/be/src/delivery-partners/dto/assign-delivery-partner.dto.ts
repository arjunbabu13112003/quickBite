import { IsInt, Min, IsNotEmpty } from 'class-validator';

export class AssignDeliveryPartnerDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  deliveryPartnerId: number;
}
