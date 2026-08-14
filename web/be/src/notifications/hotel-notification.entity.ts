import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Hotel } from '../hotels/hotel.entity';

@Entity('hotel_notifications')
export class HotelNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hotelId: number;

  @ManyToOne(() => Hotel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  orderId: number;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
