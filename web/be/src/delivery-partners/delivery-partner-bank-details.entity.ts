import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { DeliveryPartner } from './delivery-partner.entity';

@Entity('delivery_partner_bank_details')
export class DeliveryPartnerBankDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  deliveryPartnerId: number;

  @Column({ type: 'varchar', length: 100 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 255 })
  bankAccountNumberEncrypted: string;

  @Column({ type: 'varchar', length: 10 })
  accountLast4: string;

  @Column({ type: 'varchar', length: 50 })
  ifscCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  upiId?: string;

  @OneToOne(() => DeliveryPartner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
