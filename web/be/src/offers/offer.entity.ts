import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Hotel } from '../hotels/hotel.entity';
import { Category } from '../categories/category.entity';
import { Food } from '../foods/food.entity';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hotelId: number;

  @ManyToOne(() => Hotel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  discountType: string; // 'percentage' | 'flat' | 'free_delivery'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumOrderValue: number;

  @Column({ type: 'varchar', length: 50, default: 'all' })
  applicabilityType: string; // 'all' | 'categories' | 'foods'

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ type: 'integer', nullable: true })
  totalUsageLimit?: number;

  @Column({ type: 'integer', default: 1 })
  usagePerCustomer: number;

  @Column({ type: 'integer', default: 0 })
  redemptionCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToMany(() => Category, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'offer_categories',
    joinColumn: { name: 'offerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  applicableCategories: Category[];

  @ManyToMany(() => Food, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'offer_foods',
    joinColumn: { name: 'offerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'foodId', referencedColumnName: 'id' },
  })
  applicableFoods: Food[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
