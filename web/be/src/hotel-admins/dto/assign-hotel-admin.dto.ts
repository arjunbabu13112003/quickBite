import { IsOptional, IsInt, IsEmail } from 'class-validator';

export class AssignHotelAdminDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsEmail()
  email?: string;
}
