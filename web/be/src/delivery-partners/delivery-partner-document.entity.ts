import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { DeliveryPartner } from './delivery-partner.entity';

export enum DocumentType {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VEHICLE_RC = 'VEHICLE_RC',
  VEHICLE_INSURANCE = 'VEHICLE_INSURANCE',
}

export enum DocumentVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Entity('delivery_partner_documents')
@Unique(['deliveryPartnerId', 'documentType'])
export class DeliveryPartnerDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deliveryPartnerId: number;

  @Column({ type: 'varchar', length: 50 })
  documentType: DocumentType;

  @Column({ type: 'varchar', length: 255 })
  storageKey: string;

  @Column({ type: 'varchar', length: 255 })
  originalFileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'integer' })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: DocumentVerificationStatus.PENDING,
  })
  verificationStatus: DocumentVerificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verificationNote?: string;

  @ManyToOne(() => DeliveryPartner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliveryPartnerId' })
  deliveryPartner: DeliveryPartner;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
