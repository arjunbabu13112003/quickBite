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

export enum PartnerWalletAdjustmentDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum PartnerWalletAdjustmentStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SETTLED = 'SETTLED',
  REVERSED = 'REVERSED',
}

@Entity('partner_wallet_adjustments')
@Index(['deliveryPartnerId', 'status'])
export class PartnerWalletAdjustment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  direction: PartnerWalletAdjustmentDirection;

  @Column({
    type: 'varchar',
    length: 50,
    default: PartnerWalletAdjustmentStatus.AVAILABLE,
  })
  status: PartnerWalletAdjustmentStatus;

  @Column({ type: 'integer', nullable: true })
  activeSettlementId: number | null;

  @Column({ type: 'text' })
  reason: string;

  @Column()
  createdByAdminUserId: number;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @CreateDateColumn()
  createdAt: Date;
}
