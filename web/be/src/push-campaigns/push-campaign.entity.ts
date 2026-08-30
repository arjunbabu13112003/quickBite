import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_campaigns')
export class PushCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notificationImageUrl?: string;

  @Column({ type: 'varchar', length: 50 })
  targetAudience: string; // 'ALL_CUSTOMERS' | 'SELECTED_CUSTOMERS' | 'ACTIVE_CUSTOMERS' | 'ORDERED_BEFORE' | 'NOT_ORDERED_RECENTLY' | 'SELECTED_CITY'

  @Column({ type: 'jsonb', nullable: true })
  selectedUserIds?: number[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  selectedCity?: string;

  @Column({ type: 'varchar', length: 50 })
  tapAction: string; // 'HOME' | 'OFFERS' | 'CAMPAIGN' | 'RESTAURANT' | 'ORDERS'

  @Column({ type: 'varchar', length: 255, nullable: true })
  tapActionArgument?: string;

  @Column({ type: 'varchar', length: 20, default: 'NOW' })
  scheduleType: string; // 'NOW' | 'LATER'

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date; // Normalize to UTC on save

  @Column({ type: 'varchar', length: 50, nullable: true })
  repeatPattern?: string; // 'DAILY' | 'WEEKLY' | 'SELECTED_DAYS'

  @Column({ type: 'jsonb', nullable: true })
  repeatDays?: string[]; // ['Monday', 'Friday'] etc.

  @Column({ type: 'integer', default: 1 })
  repeatInterval: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sendTime?: string; // '18:00'

  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone: string; // 'Asia/Kolkata'

  @Column({ type: 'varchar', length: 50, default: 'NEVER' })
  endDateType: string; // 'NEVER' | 'ON_DATE' | 'AFTER_N_SENDS'

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'integer', nullable: true })
  endAfterSendsCount?: number;

  @Column({ type: 'varchar', length: 50, default: 'Active' })
  recurrenceStatus: string; // 'Active' | 'Paused' | 'Stopped' | 'Completed'

  @Column({ type: 'integer', default: 0 })
  scheduledOccurrenceCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt?: Date;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sendingStartedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'integer', default: 0 })
  sendAttemptCount: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'varchar', length: 50, default: 'Draft' })
  status: string; // 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed'

  @Column({ type: 'jsonb', nullable: true })
  stats?: {
    targetedCount: number;
    submittedCount: number;
    failedCount: number;
    noTokenCount: number;
    unknownCount: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
