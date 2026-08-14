import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { CartItem } from './cart-item.entity';
import { FoodCustomizationChoice } from '../food-customizations/food-customization-choice.entity';

@Entity('cart_item_customization_choices')
@Unique(['cartItemId', 'choiceId'])
export class CartItemCustomizationChoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cartItemId: number;

  @Column()
  choiceId: number;

  @ManyToOne(() => CartItem, (item) => item.customizationChoices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cartItemId' })
  cartItem: CartItem;

  @ManyToOne(() => FoodCustomizationChoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'choiceId' })
  foodCustomizationChoice: FoodCustomizationChoice;

  @CreateDateColumn()
  createdAt: Date;
}
