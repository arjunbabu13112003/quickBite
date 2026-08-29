import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BrandingAppType {
  CUSTOMER = 'CUSTOMER',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

export enum BrandingStatus {
  CURRENT = 'CURRENT',
  PENDING_UPDATE = 'PENDING_UPDATE',
}

@Entity('branding')
export class Branding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: BrandingAppType,
    unique: true,
  })
  appType: BrandingAppType;

  @Column({ type: 'text' })
  currentIconUrl: string;

  @Column({ type: 'text', nullable: true })
  currentPreparedIconUrl: string;

  @Column({ type: 'text', nullable: true })
  pendingIconUrl: string;

  @Column({ type: 'text', nullable: true })
  pendingPreparedIconUrl: string;

  @Column({ type: 'text', default: '' })
  currentAppName: string;

  @Column({ type: 'text', nullable: true })
  pendingAppName: string;

  @Column({ type: 'text', nullable: true })
  currentNotificationIconUrl: string;

  @Column({ type: 'text', nullable: true })
  currentPreparedNotificationIconUrl: string;

  @Column({ type: 'text', nullable: true })
  pendingNotificationIconUrl: string;

  @Column({ type: 'text', nullable: true })
  pendingPreparedNotificationIconUrl: string;

  @Column({
    type: 'enum',
    enum: BrandingStatus,
    default: BrandingStatus.CURRENT,
  })
  status: BrandingStatus;

  @Column({ type: 'float', default: 1.0 })
  currentScale: number;

  @Column({ type: 'float', default: 0.0 })
  currentOffsetX: number;

  @Column({ type: 'float', default: 0.0 })
  currentOffsetY: number;

  @Column({ type: 'float', default: 0.0 })
  currentPadding: number;

  @Column({ type: 'float', nullable: true })
  pendingScale: number;

  @Column({ type: 'float', nullable: true })
  pendingOffsetX: number;

  @Column({ type: 'float', nullable: true })
  pendingOffsetY: number;

  @Column({ type: 'float', nullable: true })
  pendingPadding: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
