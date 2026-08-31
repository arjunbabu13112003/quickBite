import { plainToInstance } from 'class-transformer';
import { IsNumber, Min, Max, IsEnum, IsString, IsIn, validateSync } from 'class-validator';

export enum TaxOwner {
  HOTEL = 'hotel',
  PLATFORM = 'platform',
}

export enum DiscountAbsorbedBy {
  HOTEL = 'hotel',
  PLATFORM = 'platform',
}

class EnvironmentVariables {
  @IsNumber()
  @Min(0)
  @Max(1)
  PLATFORM_COMMISSION_RATE: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  DELIVERY_PARTNER_EARNING_RATE: number;

  @IsEnum(TaxOwner)
  PAYMENT_TAX_OWNER: TaxOwner;

  @IsEnum(DiscountAbsorbedBy)
  PAYMENT_DISCOUNT_ABSORBED_BY: DiscountAbsorbedBy;

  @IsString()
  RAZORPAY_KEY_ID: string;

  @IsString()
  RAZORPAY_KEY_SECRET: string;

  @IsString()
  @IsIn(['test'])
  RAZORPAY_MODE: string;

  @IsString()
  RAZORPAY_WEBHOOK_SECRET: string;
}

export function validate(config: Record<string, any>) {
  const isProd = (config.NODE_ENV || process.env.NODE_ENV) === 'production';
  const isOtpDev = config.OTP_DEV_MODE === 'true' || config.OTP_DEV_MODE === true || process.env.OTP_DEV_MODE === 'true';
  if (isProd && isOtpDev) {
    throw new Error('Safety violation: OTP_DEV_MODE cannot be enabled in production.');
  }

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    {
      ...config,
      PLATFORM_COMMISSION_RATE: config.PLATFORM_COMMISSION_RATE !== undefined ? Number(config.PLATFORM_COMMISSION_RATE) : 0.10,
      DELIVERY_PARTNER_EARNING_RATE: config.DELIVERY_PARTNER_EARNING_RATE !== undefined ? Number(config.DELIVERY_PARTNER_EARNING_RATE) : 1.00,
      PAYMENT_TAX_OWNER: config.PAYMENT_TAX_OWNER || 'hotel',
      PAYMENT_DISCOUNT_ABSORBED_BY: config.PAYMENT_DISCOUNT_ABSORBED_BY || 'hotel',
      RAZORPAY_KEY_ID: config.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
      RAZORPAY_KEY_SECRET: config.RAZORPAY_KEY_SECRET || 'placeholder_secret',
      RAZORPAY_MODE: config.RAZORPAY_MODE || 'test',
      RAZORPAY_WEBHOOK_SECRET: config.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder',
    },
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    // Redact secrets if they are somehow part of class-validator error output
    const errorMessage = errors.map(err => {
      if (err.property === 'RAZORPAY_KEY_SECRET') {
        return 'RAZORPAY_KEY_SECRET must be a string';
      }
      if (err.property === 'RAZORPAY_WEBHOOK_SECRET') {
        return 'RAZORPAY_WEBHOOK_SECRET must be a string';
      }
      return err.toString();
    }).join('; ');
    throw new Error(`Environment validation failed: ${errorMessage}`);
  }
  return validatedConfig;
}
