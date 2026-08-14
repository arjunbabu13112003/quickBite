import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DeliveryPartner } from '../../delivery-partners/delivery-partner.entity';
import { PayoutStatus } from '../enums/payout-status.enum';

@Entity('delivery_partner_payouts')
@Index(['deliveryPartnerId'])
@Index(['status'])
export class DeliveryPartnerPayout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  @Column({ type: 'varchar', length: 50, default: 'razorpay' })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  providerPayoutId?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'integer', default: 1 })
  attemptCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastAttemptAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
