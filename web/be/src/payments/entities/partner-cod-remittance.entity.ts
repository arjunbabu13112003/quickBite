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
import { User } from '../../users/user.entity';

@Entity('partner_cod_remittances')
@Index(['deliveryPartnerId'])
export class PartnerCodRemittance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50, default: 'RECORDED' })
  status: string; // RECORDED

  @Column({ type: 'varchar', length: 50 })
  paymentMethod: string; // CASH, BANK, OTHER

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  recordedByUserId: number;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recordedByUserId' })
  recordedByUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
