import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DeliveryPartner } from '../../delivery-partners/delivery-partner.entity';
import { Order } from '../../orders/order.entity';

export enum PartnerCodTransactionType {
  COLLECTED = 'COLLECTED',
  REMITTED = 'REMITTED',
  ADJUSTMENT_DEBIT = 'ADJUSTMENT_DEBIT',
  ADJUSTMENT_CREDIT = 'ADJUSTMENT_CREDIT',
}

@Entity('partner_cod_transactions')
@Index(['deliveryPartnerId'])
@Index(['orderId'])
@Index(['orderId', 'type'], { unique: true, where: '"type" = \'COLLECTED\'' })
export class PartnerCodTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column()
  orderId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: PartnerCodTransactionType;

  @Column({ type: 'varchar', length: 50, default: 'COMPLETED' })
  status: string;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;
}
