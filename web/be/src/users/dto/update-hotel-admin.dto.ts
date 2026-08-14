import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateHotelAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;
}
