import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelAdmin } from './hotel-admin.entity';
import { User } from '../users/user.entity';
import { Hotel } from '../hotels/hotel.entity';
import { AssignHotelAdminDto } from './dto/assign-hotel-admin.dto';
import { UserRole } from '../users/user-role.enum';

@Injectable()
export class HotelAdminsService {
  constructor(
    @InjectRepository(HotelAdmin)
    private readonly hotelAdminRepository: Repository<HotelAdmin>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
  ) {}

  async assign(hotelId: number, dto: AssignHotelAdminDto): Promise<HotelAdmin> {
    const { userId, email } = dto;

    if (!userId && !email) {
      throw new BadRequestException('Either userId or email must be provided');
    }

    if (userId && email) {
      throw new BadRequestException('Only one of userId or email must be provided, not both');
    }

    // 1. Verify hotel exists and is active
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }
    if (!hotel.isActive) {
      throw new BadRequestException('Target hotel is inactive');
    }

    // 2. Find target user
    let user: User;
    if (userId) {
      user = await this.userRepository.findOne({ where: { id: userId } });
    } else if (email) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    if (!user) {
      throw new NotFoundException('Target user not found');
    }

    // 3. Check duplicate assignment
    const existingAssignment = await this.hotelAdminRepository.findOne({
      where: { userId: user.id, hotelId },
    });

    if (existingAssignment) {
      if (!existingAssignment.isActive) {
        existingAssignment.isActive = true;
        const saved = await this.hotelAdminRepository.save(existingAssignment);
        if (user.role === UserRole.CUSTOMER) {
          user.role = UserRole.HOTEL_ADMIN;
          await this.userRepository.save(user);
        }
        return saved;
      }
      throw new ConflictException('User is already assigned to this hotel');
    }

    // 4. Create mapping
    const newAssignment = this.hotelAdminRepository.create({
      userId: user.id,
      hotelId,
      isActive: true,
    });

    const savedAssignment = await this.hotelAdminRepository.save(newAssignment);

    // 5. Update user role if it's currently 'customer'
    if (user.role === UserRole.CUSTOMER) {
      user.role = UserRole.HOTEL_ADMIN;
      await this.userRepository.save(user);
    }

    return savedAssignment;
  }

  async getAdminsForHotel(hotelId: number): Promise<HotelAdmin[]> {
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }

    return await this.hotelAdminRepository.find({
      where: { hotelId },
      relations: ['user'],
    });
  }

  async deactivate(hotelId: number, adminId: number): Promise<HotelAdmin> {
    const assignment = await this.hotelAdminRepository.findOne({
      where: { id: adminId, hotelId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Hotel admin assignment not found for admin ID ${adminId} and hotel ID ${hotelId}`,
      );
    }

    assignment.isActive = false;
    return await this.hotelAdminRepository.save(assignment);
  }

  async getMyHotels(userId: number): Promise<Hotel[]> {
    const assignments = await this.hotelAdminRepository.find({
      where: { userId, isActive: true },
      relations: ['hotel'],
    });

    return assignments
      .map((a) => a.hotel)
      .filter((h) => h && h.isActive === true);
  }

  // Reusable helper to verify if a hotel admin is assigned to a specific hotel
  async checkHotelAdminAccess(userId: number, hotelId: number): Promise<boolean> {
    const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
    if (!hotel || !hotel.isActive) {
      throw new ForbiddenException(
        'This hotel is inactive or does not exist',
      );
    }

    const assignment = await this.hotelAdminRepository.findOne({
      where: { userId, hotelId, isActive: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You do not have administrative access to this hotel',
      );
    }

    return true;
  }
}
