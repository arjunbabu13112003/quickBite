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

export enum PartnerSettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PartnerSettlementPaymentMethod {
  MANUAL = 'MANUAL',
  BANK = 'BANK',
  UPI = 'UPI',
  RAZORPAYX = 'RAZORPAYX',
}

@Entity('partner_settlements')
@Index(['deliveryPartnerId', 'status'])
export class PartnerSettlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grossEarningsAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  creditAdjustmentsAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  debitAdjustmentsAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  netAmount: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: PartnerSettlementStatus.PENDING,
  })
  status: PartnerSettlementStatus;

  @Column({
    type: 'varchar',
    length: 50,
    default: PartnerSettlementPaymentMethod.MANUAL,
  })
  paymentMethod: PartnerSettlementPaymentMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalReference?: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason?: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
