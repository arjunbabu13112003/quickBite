import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DeliveryPartnersService } from './delivery-partners.service';

@Controller('auth/delivery-partner/forgot-password')
export class DeliveryPartnerForgotPasswordController {
  constructor(private readonly partnersService: DeliveryPartnersService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: { identifier: string }) {
    return this.partnersService.forgotPasswordRequestOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: { identifier: string; otp: string }) {
    return this.partnersService.forgotPasswordVerifyOtp(dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body()
    dto: {
      resetToken: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    return this.partnersService.forgotPasswordReset(dto);
  }
}
