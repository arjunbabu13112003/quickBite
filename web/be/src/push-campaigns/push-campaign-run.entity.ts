import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { PushCampaign } from './push-campaign.entity';

@Entity('push_campaign_runs')
@Unique(['occurrenceKey']) // Unique for scheduler-generated occurrences (manual sends have null occurrenceKey)
@Unique(['idempotencyKey']) // Unique for manual action idempotency keys
@Index(['campaignId'])
export class PushCampaignRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  campaignId: number;

  @Column({ type: 'timestamp' })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  heartbeatAt?: Date;

  @Column({ type: 'varchar', length: 50, default: 'Scheduled' })
  status: string; // 'Scheduled' | 'Sending' | 'Sent' | 'Failed' | 'Cancelled' | 'Skipped'

  @Column({ type: 'integer', default: 0 })
  targetedCount: number;

  @Column({ type: 'integer', default: 0 })
  submittedCount: number;

  @Column({ type: 'integer', default: 0 })
  failedCount: number;

  @Column({ type: 'integer', default: 0 })
  noTokenCount: number;

  @Column({ type: 'integer', default: 0 })
  unknownCount: number;

  @Column({ type: 'integer', default: 0 })
  receiptPendingCount: number;

  @Column({ type: 'integer', default: 0 })
  receiptOkCount: number;

  @Column({ type: 'integer', default: 0 })
  receiptErrorCount: number;

  @Column({ type: 'integer', default: 0 })
  receiptUnavailableCount: number;

  @Column({ type: 'integer', default: 0 })
  invalidTokensCount: number;

  @Column({ type: 'varchar', length: 50, default: 'SCHEDULED' })
  triggerType: string; // 'SCHEDULED' | 'MANUAL' | 'RESEND'

  @Column({ type: 'varchar', length: 255, nullable: true })
  occurrenceKey?: string; // campaignId_scheduledFor (for scheduler occurrences)

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string; // unique UUID or token passed for manual actions

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => PushCampaign, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'campaignId' })
  campaign: PushCampaign;
}
