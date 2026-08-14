import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('order_item_customizations')
export class OrderItemCustomization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderItemId: number;

  @Column({ type: 'varchar', length: 255 })
  groupName: string;

  @Column({ type: 'varchar', length: 255 })
  choiceName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  additionalPrice: number;

  @ManyToOne(() => OrderItem, (item) => item.customizations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @CreateDateColumn()
  createdAt: Date;
}
