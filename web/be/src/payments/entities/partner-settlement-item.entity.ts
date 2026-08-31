import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { PartnerSettlement } from './partner-settlement.entity';
import { PartnerEarning } from './partner-earning.entity';
import { PartnerWalletAdjustment } from './partner-wallet-adjustment.entity';

export enum PartnerSettlementItemType {
  EARNING = 'EARNING',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('partner_settlement_items')
@Index(['settlementId'])
@Index(['partnerEarningId'])
@Index(['walletAdjustmentId'])
@Index(['settlementId', 'partnerEarningId'], { unique: true, where: '"partnerEarningId" IS NOT NULL' })
@Index(['settlementId', 'walletAdjustmentId'], { unique: true, where: '"walletAdjustmentId" IS NOT NULL' })
@Check(`("itemType" = 'EARNING' AND "partnerEarningId" IS NOT NULL AND "walletAdjustmentId" IS NULL) OR ("itemType" = 'ADJUSTMENT' AND "walletAdjustmentId" IS NOT NULL AND "partnerEarningId" IS NULL)`)
export class PartnerSettlementItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  settlementId: number;

  @Column({
    type: 'varchar',
    length: 50,
  })
  itemType: PartnerSettlementItemType;

  @Column({ type: 'integer', nullable: true })
  partnerEarningId: number | null;

  @Column({ type: 'integer', nullable: true })
  walletAdjustmentId: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountSnapshot: number;

  @ManyToOne(() => PartnerSettlement, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'settlementId' })
  settlement: PartnerSettlement;

  @ManyToOne(() => PartnerEarning, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'partnerEarningId' })
  partnerEarning: PartnerEarning | null;

  @ManyToOne(() => PartnerWalletAdjustment, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'walletAdjustmentId' })
  walletAdjustment: PartnerWalletAdjustment | null;

  @CreateDateColumn()
  createdAt: Date;
}
