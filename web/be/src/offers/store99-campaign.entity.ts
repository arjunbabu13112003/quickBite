import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('store_99_campaigns')
export class Store99Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bannerUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 99.00 })
  price: number; // For FIXED_PRICE selling price

  @Column({ type: 'varchar', length: 50, default: 'FIXED_PRICE' })
  offerType: string; // 'FIXED_PRICE' | 'FLAT_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_DELIVERY'

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  flatDiscountAmount?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageDiscount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumOrder?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDeliveryFee?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  deliveryRadius?: number;

  @Column({ type: 'varchar', length: 50, default: 'items' })
  appliesTo: string; // 'all' (entire restaurant) | 'items' (specific items)

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
