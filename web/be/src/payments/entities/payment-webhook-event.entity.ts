import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payment_webhook_events')
@Index(['providerEventId'])
@Index(['payloadHash'])
@Index(['processingStatus'])
export class PaymentWebhookEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, default: 'razorpay' })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  providerEventId?: string;

  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerPaymentId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerOrderId?: string;

  @Column({ type: 'varchar', length: 64 })
  payloadHash: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  processingStatus: string;

  @CreateDateColumn({ type: 'timestamp' })
  receivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
