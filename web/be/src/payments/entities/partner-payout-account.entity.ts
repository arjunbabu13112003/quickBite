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
import { DeliveryPartner } from '../../delivery-partners/delivery-partner.entity';
import { User } from '../../users/user.entity';

export enum PayoutAccountType {
  BANK = 'BANK',
  UPI = 'UPI',
}

export enum PayoutAccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  DISABLED = 'DISABLED',
}

@Entity('partner_payout_accounts')
@Index(['deliveryPartnerId'])
export class PartnerPayoutAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column({
    type: 'varchar',
    length: 20,
  })
  accountType: PayoutAccountType;

  @Column({
    type: 'varchar',
    length: 50,
    default: PayoutAccountStatus.PENDING_VERIFICATION,
  })
  status: PayoutAccountStatus;

  // BANK specific fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  accountHolderName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountNumberEncrypted?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  accountLast4?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ifscCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  // UPI specific field
  @Column({ type: 'varchar', length: 255, nullable: true })
  upiId?: string;

  // Common metadata
  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'text', nullable: true })
  verificationNote?: string;

  @Column({ nullable: true })
  verifiedByUserId?: number;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'verifiedByUserId' })
  verifiedByUser?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
