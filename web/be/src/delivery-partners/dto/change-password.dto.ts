import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required.' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required.' })
  @IsString()
  @MinLength(8, { message: 'Minimum 8 characters required' })
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm new password is required.' })
  @IsString()
  @MinLength(8, { message: 'Minimum 8 characters required' })
  confirmNewPassword: string;
}
