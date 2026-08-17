import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('store_99_items')
@Unique(['campaignId', 'hotelId', 'foodId'])
export class Store99Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  campaignId: number;

  @Column()
  hotelId: number;

  @Column()
  foodId: number;

  @Column({ type: 'varchar', length: 50, default: 'approved' })
  status: string; // 'pending' | 'approved' | 'rejected' | 'active'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
