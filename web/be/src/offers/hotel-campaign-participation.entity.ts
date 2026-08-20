import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('hotel_campaign_participations')
@Unique(['campaignId', 'hotelId'])
export class HotelCampaignParticipation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  campaignId: number;

  @Column()
  hotelId: number;

  @Column({ type: 'varchar', length: 50, default: 'invited' })
  status: string; // 'invited' | 'participating' | 'declined' | 'ended'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
