import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Hotel } from '../hotels/hotel.entity';
import { Address } from '../addresses/address.entity';
import { OrderItem } from './order-item.entity';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { OrderStatus } from './enums/order-status.enum';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';

@Entity('orders')
@Index(['userId'])
@Index(['hotelId'])
@Unique(['userId', 'idempotencyKey'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNumber: string;

  @Column()
  userId: number;

  @Column()
  hotelId: number;

  @Column({ nullable: true })
  addressId?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 50, default: PaymentMethod.COD })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 50, default: PaymentStatus.PENDING })
  paymentStatus: string;

  @Column({ type: 'varchar', length: 50, default: OrderStatus.PLACED })
  orderStatus: string;

  @Column({ type: 'text', nullable: true })
  customerNote?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  couponCode?: string;

  // Address Snapshot fields
  @Column({ type: 'varchar', length: 255 })
  deliveryRecipientName: string;

  @Column({ type: 'varchar', length: 50 })
  deliveryPhoneNumber: string;

  @Column({ type: 'text' })
  deliveryAddressLine1: string;

  @Column({ type: 'text', nullable: true })
  deliveryAddressLine2?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveryLandmark?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveryArea?: string;

  @Column({ type: 'varchar', length: 100 })
  deliveryCity: string;

  @Column({ type: 'varchar', length: 100 })
  deliveryState: string;

  @Column({ type: 'varchar', length: 20 })
  deliveryPincode: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  deliveryLatitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  deliveryLongitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  deliveryBypassLatitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  deliveryBypassLongitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  deliveryBypassDistance?: number;

  @Column({ type: 'timestamp', nullable: true })
  deliveryBypassTimestamp?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyFingerprint?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  placedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  preparingAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  readyForPickupAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  outForDeliveryAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cashCollectedAt?: Date;

  @Column({ nullable: true })
  cashCollectedByDeliveryPartnerId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveryPinHash?: string;

  @Column({ type: 'timestamp', nullable: true })
  deliveryPinVerifiedAt?: Date;

  @Column({ type: 'int', default: 0 })
  deliveryPinAttemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  deliveryPinLockedUntil?: Date;

  @Column({ nullable: true })
  deliveryPartnerId?: number;

  @Column({ type: 'boolean', default: false })
  partnerNearbyNotified: boolean;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner?: DeliveryPartner;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Hotel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @ManyToOne(() => Address, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'addressId' })
  address?: Address;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
