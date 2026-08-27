import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  mobileNumber: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  profileImage?: string;

  @Column({ type: 'varchar', nullable: true })
  pushToken?: string;

  @CreateDateColumn()
  createdAt: Date;
}
