import { IsNotEmpty, IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';
import { PayoutAccountType } from '../entities/partner-payout-account.entity';

export class CreatePayoutAccountDto {
  @IsNotEmpty()
  @IsEnum(PayoutAccountType)
  accountType: PayoutAccountType;

  // BANK specific validation
  @ValidateIf(o => o.accountType === PayoutAccountType.BANK)
  @IsNotEmpty({ message: 'Account holder name is required for BANK accounts' })
  @IsString()
  accountHolderName?: string;

  @ValidateIf(o => o.accountType === PayoutAccountType.BANK)
  @IsNotEmpty({ message: 'Account number is required for BANK accounts' })
  @IsString()
  accountNumber?: string;

  @ValidateIf(o => o.accountType === PayoutAccountType.BANK)
  @IsNotEmpty({ message: 'Confirm account number is required for BANK accounts' })
  @IsString()
  confirmAccountNumber?: string;

  @ValidateIf(o => o.accountType === PayoutAccountType.BANK)
  @IsNotEmpty({ message: 'IFSC code is required for BANK accounts' })
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  // UPI specific validation
  @ValidateIf(o => o.accountType === PayoutAccountType.UPI)
  @IsNotEmpty({ message: 'UPI ID is required for UPI accounts' })
  @IsString()
  upiId?: string;
}
