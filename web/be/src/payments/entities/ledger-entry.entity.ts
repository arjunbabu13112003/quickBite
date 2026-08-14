import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from '../../orders/order.entity';
import { Payment } from './payment.entity';
import { Hotel } from '../../hotels/hotel.entity';
import { DeliveryPartner } from '../../delivery-partners/delivery-partner.entity';
import { HotelSettlement } from './hotel-settlement.entity';
import { DeliveryPartnerPayout } from './delivery-partner-payout.entity';
import { LedgerEntryType } from '../enums/ledger-entry-type.enum';
import { AccountType } from '../enums/account-type.enum';
import { Direction } from '../enums/direction.enum';

@Entity('ledger_entries')
@Index(['accountType'])
@Index(['hotelId'])
@Index(['deliveryPartnerId'])
@Index(['orderId'])
@Index(['hotelSettlementId'])
@Index(['deliveryPartnerPayoutId'])
export class LedgerEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  entryType: LedgerEntryType;

  @Column({ nullable: true })
  orderId?: number;

  @Column({ nullable: true })
  paymentId?: number;

  @Column({ nullable: true })
  hotelId?: number;

  @Column({ nullable: true })
  deliveryPartnerId?: number;

  @Column({ nullable: true })
  hotelSettlementId?: number;

  @Column({ nullable: true })
  deliveryPartnerPayoutId?: number;

  @Column({ type: 'varchar', length: 50 })
  accountType: AccountType;

  @Column({ type: 'varchar', length: 20 })
  direction: Direction;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType?: string;

  @Column({ nullable: true })
  referenceId?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;

  @ManyToOne(() => Hotel, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hotelId' })
  hotel?: Hotel;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner?: DeliveryPartner;

  @ManyToOne(() => HotelSettlement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hotelSettlementId' })
  hotelSettlement?: HotelSettlement;

  @ManyToOne(() => DeliveryPartnerPayout, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deliveryPartnerPayoutId' })
  deliveryPartnerPayout?: DeliveryPartnerPayout;

  @CreateDateColumn()
  createdAt: Date;
}
