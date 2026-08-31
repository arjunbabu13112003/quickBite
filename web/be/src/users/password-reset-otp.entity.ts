import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('password_reset_otps')
@Index('uq_active_otp', ['userId', 'purpose'], { unique: true, where: '"isUsed" = false' })
export class PasswordResetOtp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: 'DELIVERY_PARTNER_PASSWORD_RESET' })
  purpose: string;

  @Column()
  otpHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
