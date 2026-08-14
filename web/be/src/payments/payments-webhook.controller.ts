import { Controller, Post, Headers, Request, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay/webhook')
  async handleWebhook(@Headers('x-razorpay-signature') signature: string, @Request() req) {
    if (!signature) {
      throw new BadRequestException('Missing Razorpay signature');
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw request body is not available');
    }
    return this.paymentsService.handleRazorpayWebhook(rawBody, signature);
  }
}
