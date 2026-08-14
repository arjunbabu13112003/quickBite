import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Offer } from './offer.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';

@Entity('offer_redemptions')
export class OfferRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  offerId: number;

  @Column()
  customerId: number;

  @Column()
  orderId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @ManyToOne(() => Offer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offerId' })
  offer: Offer;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @CreateDateColumn()
  redeemedAt: Date;
}
