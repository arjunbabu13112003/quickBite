import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Import using require to avoid commonjs/esModuleInterop compilation issues
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayGateway {
  private razorpayClient: any;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    const mode = this.configService.get<string>('RAZORPAY_MODE', 'test');

    if (mode !== 'test') {
      throw new Error('Razorpay integration is running in TEST MODE only. Live mode is not permitted in Step 7B.1.');
    }

    if (!keyId || !keyId.startsWith('rzp_test_')) {
      throw new Error('Invalid Razorpay key ID. Key ID must begin with "rzp_test_" for test mode.');
    }

    if (!keySecret) {
      throw new Error('Razorpay key secret is missing.');
    }

    this.razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Creates a Razorpay Order.
   * @param amountInPaise Order amount in integer paise.
   * @param receiptId Unique receipt ID / QuickBite Order ID reference.
   */
  async createOrder(amountInPaise: number, receiptId: string): Promise<any> {
    try {
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
      };
      return await this.razorpayClient.orders.create(options);
    } catch (error: any) {
      let errorDescription = 'Unknown Razorpay error';
      let errorCode = 'UNKNOWN_ERROR';
      let errorStatus = error?.statusCode || error?.status || 400;

      if (error && typeof error === 'object') {
        if (error.error && typeof error.error === 'object') {
          errorCode = error.error.code || errorCode;
          errorDescription = error.error.description || errorDescription;
        } else if (error.message) {
          errorDescription = error.message;
        }
      }

      console.error(`[DEBUG RazorpayGateway] Order creation failed. Status: ${errorStatus}, Code: ${errorCode}, Description: ${errorDescription}`);

      throw new BadRequestException(
        `Razorpay Order creation failed: [Status: ${errorStatus}, Code: ${errorCode}, Description: ${errorDescription}]`
      );
    }
  }

  /**
   * Verifies the Razorpay payment signature server-side.
   */
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const crypto = require('crypto');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new Error('Razorpay key secret is missing.');
    }
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(orderId + '|' + paymentId)
      .digest('hex');

    if (generatedSignature.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  }
}
