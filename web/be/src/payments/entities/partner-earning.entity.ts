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
import { Order } from '../../orders/order.entity';

export enum PartnerEarningStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SETTLED = 'SETTLED',
  REVERSED = 'REVERSED',
}

@Entity('partner_earnings')
@Index(['deliveryPartnerId', 'status'])
@Index(['status', 'availableAt'])
@Index(['orderId', 'deliveryPartnerId'], { unique: true })
export class PartnerEarning {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column()
  orderId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  baseDeliveryFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  distanceFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  incentiveAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tipAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  adjustmentAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grossEarning: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: PartnerEarningStatus.PENDING,
  })
  status: PartnerEarningStatus;

  @Column({ type: 'timestamp' })
  availableAt: Date;

  @Column({ type: 'integer', nullable: true })
  activeSettlementId: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  earnedAt: Date;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
