import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Hotel } from '../../hotels/hotel.entity';
import { DeliveryPartner } from '../../delivery-partners/delivery-partner.entity';

@Entity('recipient_accounts')
export class RecipientAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  hotelId?: number;

  @Column({ nullable: true })
  deliveryPartnerId?: number;

  @Column({ type: 'varchar', length: 50, default: 'razorpay' })
  provider: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  providerAccountId: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  onboardingStatus: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  kycStatus: string;

  @ManyToOne(() => Hotel, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hotelId' })
  hotel?: Hotel;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner?: DeliveryPartner;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
