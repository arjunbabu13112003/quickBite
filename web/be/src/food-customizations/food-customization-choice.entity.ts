import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FoodCustomizationGroup } from './food-customization-group.entity';

@Entity('food_customization_choices')
export class FoodCustomizationChoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  additionalPrice: number;

  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(
    () => FoodCustomizationGroup,
    (group) => group.choices,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'groupId' })
  group: FoodCustomizationGroup;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
