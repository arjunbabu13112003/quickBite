import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from '../../orders/order.entity';

@Entity('order_financial_allocations')
@Index(['orderId'])
export class OrderFinancialAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  hotelGrossAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  hotelCommissionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  hotelNetAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryPartnerEarning: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformEarning: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  appliedHotelCommissionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  appliedDeliveryPartnerEarningRate: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  calculatedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  finalizedAt: Date;

  @OneToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
