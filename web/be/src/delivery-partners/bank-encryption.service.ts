import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class BankEncryptionService {
  private readonly keyBuffer: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly VERSION = 'v1';

  constructor(private readonly configService: ConfigService) {
    const base64Key = this.configService.get<string>('DELIVERY_PARTNER_BANK_ENCRYPTION_KEY');
    if (!base64Key) {
      throw new InternalServerErrorException(
        'DELIVERY_PARTNER_BANK_ENCRYPTION_KEY environment variable is not defined.',
      );
    }

    const buffer = Buffer.from(base64Key, 'base64');
    if (buffer.length !== 32) {
      throw new InternalServerErrorException(
        `DELIVERY_PARTNER_BANK_ENCRYPTION_KEY must decode to exactly 32 bytes. Decoded length: ${buffer.length}`,
      );
    }

    this.keyBuffer = buffer;
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${this.VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 4 || parts[0] !== this.VERSION) {
      throw new Error('Invalid or unsupported encrypted format');
    }

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ciphertext = Buffer.from(parts[3], 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
