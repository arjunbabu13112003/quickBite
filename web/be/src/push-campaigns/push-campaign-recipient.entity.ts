import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DevicePushToken } from '../users/device-push-token.entity';

@Entity('push_campaign_recipients')
@Unique(['runId', 'userId']) // ensure atomic idempotency - exactly one delivery log per customer per run
@Index(['campaignId'])
@Index(['runId'])
export class PushCampaignRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  runId: number;

  @Column()
  campaignId: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pushToken?: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string; // 'pending' | 'processing' | 'submitted' | 'failed' | 'no-token' | 'unknown'

  @Column({ type: 'varchar', length: 255, nullable: true })
  expoTicketId?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  failureType?: string; // 'PERMANENT' | 'RETRYABLE'

  @Column({ nullable: true })
  devicePushTokenId?: number;

  @ManyToOne(() => DevicePushToken, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'devicePushTokenId' })
  devicePushToken?: DevicePushToken;

  @Column({ type: 'varchar', length: 50, nullable: true })
  receiptStatus?: string; // 'PENDING' | 'OK' | 'ERROR' | 'UNAVAILABLE'

  @Column({ type: 'timestamptz', nullable: true })
  receiptCheckedAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  receiptErrorCode?: string;

  @Column({ type: 'text', nullable: true })
  receiptErrorMessage?: string;

  @Column({ type: 'integer', default: 0 })
  receiptRetryCount: number;

  @Column({ type: 'integer', default: 0 })
  receiptTransportRetryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  receiptNextCheckAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  receiptClaimId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  receiptClaimedAt?: Date;

  @CreateDateColumn()
  processedAt: Date;
}
