import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('customer_notifications')
@Unique(['userId', 'runId']) // unique promotion inbox row per customer per run
@Index(['userId'])
@Index(['runId'])
export class CustomerNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ nullable: true })
  campaignId?: number;

  @Column({ nullable: false })
  runId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 50, default: 'promotion' })
  type: string; // 'promotion'

  @Column({ type: 'jsonb', nullable: true })
  data?: any; // e.g., { action: 'OFFERS', argument: null }

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
