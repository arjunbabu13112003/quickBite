import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hotel } from '../hotels/hotel.entity';
import { Category } from '../categories/category.entity';
import { FoodCustomizationGroup } from '../food-customizations/food-customization-group.entity';
import { HomeFoodCategory } from '../home-food-categories/home-food-category.entity';

@Entity('foods')
export class Food {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hotelId: number;

  @Column()
  categoryId: number;

  @Column({ nullable: true })
  homeFoodCategoryId?: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  ingredientsList?: string[];

  @Column({ type: 'jsonb', nullable: true })
  images?: string[];

  @Column({ type: 'text', nullable: true })
  image?: string;

  @Column({ type: 'text', nullable: true })
  ingredients?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerPrice?: number;

  @Column({ type: 'boolean', default: false })
  isVeg: boolean;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: false })
  isBestseller: boolean;

  @Column({ type: 'integer', nullable: true })
  calories?: number;

  @Column({ type: 'integer', nullable: true })
  preparationTime?: number;

  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  customizable: boolean;

  @ManyToOne(() => Hotel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotelId' })
  hotel: Hotel;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ManyToOne(() => HomeFoodCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'homeFoodCategoryId' })
  homeFoodCategory?: HomeFoodCategory;

  @OneToMany(() => FoodCustomizationGroup, (group) => group.food)
  customizationGroups: FoodCustomizationGroup[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
