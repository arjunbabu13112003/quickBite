import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hotels')
export class Hotel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  image?: string;

  @Column({ type: 'text', nullable: true })
  logo?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({ type: 'integer', nullable: true })
  deliveryTimeMin?: number;

  @Column({ type: 'integer', nullable: true })
  deliveryTimeMax?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  deliveryRadiusKm?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumOrderAmount: number;

  @Column({ type: 'boolean', default: false })
  isPureVeg: boolean;

  @Column({ type: 'boolean', default: true })
  isOpen: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  acceptsOrders: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gstNumber?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fssaiNumber?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  openingTime?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  closingTime?: string;

  @Column({ type: 'integer', nullable: true })
  averagePreparationTime?: number;

  @Column({ type: 'boolean', default: true })
  supportsCOD: boolean;

  @Column({ type: 'boolean', default: true })
  supportsOnlinePayment: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cuisines?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  restaurantType?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ownerName?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  alternatePhoneNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  landmark?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legalName?: string;

  @Column({ type: 'boolean', default: true })
  isDeliveryAvailable: boolean;

  @Column({ type: 'integer', nullable: true })
  estimatedDeliveryTime?: number;

  @Column({ type: 'text', nullable: true })
  operatingHours?: string;

  @Column({ type: 'text', nullable: true })
  gallery?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
