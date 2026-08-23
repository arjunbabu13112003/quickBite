import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentVerificationStatus } from '../delivery-partner-document.entity';

export class VerifyDocumentDto {
  @IsEnum(DocumentVerificationStatus, { message: 'status must be VERIFIED or REJECTED' })
  status: DocumentVerificationStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
