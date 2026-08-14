import { IsNotEmpty, IsString, IsEmail, MinLength, IsOptional, IsInt, Min } from 'class-validator';

export class CreateHotelAdminDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  hotelId?: number;
}
