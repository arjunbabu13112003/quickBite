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
import { Food } from '../foods/food.entity';
import { FoodCustomizationChoice } from './food-customization-choice.entity';

@Entity('food_customization_groups')
export class FoodCustomizationGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  foodId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'multiple' })
  selectionType: 'single' | 'multiple';

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Food, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foodId' })
  food: Food;

  @OneToMany(
    () => FoodCustomizationChoice,
    (choice) => choice.group,
  )
  choices: FoodCustomizationChoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
