import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Food } from '../foods/food.entity';
import { OrderItemCustomization } from './order-item-customization.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @Column({ nullable: true })
  foodId?: number;

  @Column({ type: 'varchar', length: 255 })
  foodName: string;

  @Column({ type: 'text', nullable: true })
  foodImage?: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  customizationPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalUnitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lineTotal: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Food, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'foodId' })
  food?: Food;

  @OneToMany(() => OrderItemCustomization, (customization) => customization.orderItem, {
    cascade: true,
  })
  customizations: OrderItemCustomization[];

  @CreateDateColumn()
  createdAt: Date;
}
