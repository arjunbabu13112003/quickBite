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
import { Hotel } from '../../hotels/hotel.entity';
import { SettlementStatus } from '../enums/settlement-status.enum';

@Entity('hotel_settlements')
@Index(['hotelId'])
@Index(['status'])
export class HotelSettlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hotelId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  @Column({ type: 'timestamp', nullable: true })
  periodStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  periodEnd?: Date;

  @Column({ type: 'varchar', length: 50, default: 'razorpay' })
  provider: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  providerTransferId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerSettlementId?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'integer', default: 1 })
  attemptCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastAttemptAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @ManyToOne(() => Hotel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
