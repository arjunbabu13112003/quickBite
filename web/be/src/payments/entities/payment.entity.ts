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
import { Order } from '../../orders/order.entity';
import { PaymentAttemptStatus } from '../enums/payment-attempt-status.enum';

@Entity('payments')
@Index(['orderId'])
@Index(['status'])
@Index(['providerPaymentId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  paymentMethod: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: PaymentAttemptStatus.CREATED,
  })
  status: PaymentAttemptStatus;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerOrderId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  providerPaymentId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerSignature?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
