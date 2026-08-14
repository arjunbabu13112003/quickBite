import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Food } from '../foods/food.entity';

@Entity('food_favourites')
@Unique(['userId', 'foodId'])
@Index(['userId'])
export class FoodFavourite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  foodId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Food, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foodId' })
  food: Food;

  @CreateDateColumn()
  createdAt: Date;
}
