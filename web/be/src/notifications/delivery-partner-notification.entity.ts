import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryPartner } from '../delivery-partners/delivery-partner.entity';

@Entity('delivery_partner_notifications')
export class DeliveryPartnerNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type?: string;

  @Column({ nullable: true })
  orderId?: number;

  @Column({ nullable: true })
  assignmentId?: number;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
