import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';
import { User } from './user.entity';

export enum AppType {
  CUSTOMER = 'CUSTOMER',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

@Entity('device_push_tokens')
@Unique(['token'])
@Index('UQ_active_user_app_token', ['userId', 'appType'], { unique: true, where: '"isActive" = true' })
export class DevicePushToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 255 })
  token: string;

  @Column({ type: 'varchar', length: 50 })
  appType: AppType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  platform?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
