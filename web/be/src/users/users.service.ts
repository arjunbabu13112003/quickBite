import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateHotelAdminDto } from './dto/create-hotel-admin.dto';
import { UpdateHotelAdminDto } from './dto/update-hotel-admin.dto';

import { UserRole } from './user-role.enum';
import { Hotel } from '../hotels/hotel.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { name, email, mobileNumber, password } = createUserDto;

    const existingEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    const existingMobile = await this.usersRepository.findOne({ where: { mobileNumber } });
    if (existingMobile) {
      throw new ConflictException('Mobile number is already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.usersRepository.create({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
    });

    const savedUser = await this.usersRepository.save(newUser);
    const { password: _, ...userWithoutPassword } = savedUser;

    return {
      message: 'User registered successfully',
      user: userWithoutPassword,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, createdAt: __, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      accessToken,
      user: userWithoutPassword,
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role,
      profileImage: user.profileImage,
    };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if new email is already taken by another user
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const emailExists = await this.usersRepository.findOne({ where: { email: updateProfileDto.email } });
      if (emailExists) {
        throw new ConflictException('Email is already in use by another account');
      }
    }

    // Check if new mobileNumber is already taken by another user
    if (updateProfileDto.mobileNumber && updateProfileDto.mobileNumber !== user.mobileNumber) {
      const mobileExists = await this.usersRepository.findOne({ where: { mobileNumber: updateProfileDto.mobileNumber } });
      if (mobileExists) {
        throw new ConflictException('Mobile number is already in use by another account');
      }
    }

    if (updateProfileDto.name) user.name = updateProfileDto.name;
    if (updateProfileDto.email) user.email = updateProfileDto.email;
    if (updateProfileDto.mobileNumber) user.mobileNumber = updateProfileDto.mobileNumber;
    if (updateProfileDto.profileImage !== undefined) {
      user.profileImage = updateProfileDto.profileImage;
    }

    const updatedUser = await this.usersRepository.save(user);
    const { password: _, createdAt: __, ...userWithoutPassword } = updatedUser;

    return {
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    };
  }

  async getAdminStats() {
    const totalCustomers = await this.usersRepository.count({
      where: { role: UserRole.CUSTOMER }
    });
    return { totalCustomers };
  }

  async getHotelAdmins() {
    // 1. Fetch all users with role 'hotel_admin'
    const admins = await this.usersRepository.find({
      where: { role: UserRole.HOTEL_ADMIN },
      order: { id: 'DESC' },
    });

    // 2. Fetch all assignments from hotel_admins relation
    const hotelAdminRepository = this.dataSource.getRepository('HotelAdmin');
    const assignments = await hotelAdminRepository.find({
      relations: ['hotel'],
    }) as any[];

    // 3. Map assignments to each admin user
    return admins.map((admin) => {
      const adminAssignments = assignments.filter((a) => a.userId === admin.id && a.isActive === true);
      const { password, ...sanitizedUser } = admin;
      return {
        ...sanitizedUser,
        assignedHotels: adminAssignments.map((a) => ({
          id: a.hotelId,
          name: a.hotel?.name,
          isActive: a.isActive,
          assignedAt: a.createdAt,
        })),
      };
    });
  }

  async getHotelAdminById(id: number) {
    const admin = await this.usersRepository.findOne({
      where: { id, role: UserRole.HOTEL_ADMIN },
    });

    if (!admin) {
      throw new NotFoundException(`Hotel administrator with ID ${id} not found.`);
    }

    const hotelAdminRepository = this.dataSource.getRepository('HotelAdmin');
    const assignments = await hotelAdminRepository.find({
      where: { userId: admin.id, isActive: true },
      relations: ['hotel'],
    }) as any[];

    const { password, ...sanitizedUser } = admin;
    return {
      ...sanitizedUser,
      assignedHotels: assignments.map((a) => ({
        id: a.hotelId,
        assignmentId: a.id,
        name: a.hotel?.name,
        city: a.hotel?.city,
        area: a.hotel?.area,
        hotelIsActive: a.hotel?.isActive,
        hotelIsOpen: a.hotel?.isOpen,
        assignedAt: a.createdAt,
      })),
    };
  }

  async createHotelAdmin(dto: CreateHotelAdminDto) {
    const { name, email, password, hotelId } = dto;

    if (!name || !email || !password) {
      throw new BadRequestException('Name, email, and password are required');
    }

    // 1. Transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const hotelRepository = manager.getRepository(Hotel);
      const hotelAdminRepository = manager.getRepository('HotelAdmin');

      // Check existing email
      const existingEmail = await userRepository.findOne({ where: { email } });
      if (existingEmail) {
        throw new ConflictException('An account with this email already exists.');
      }

      // Generate a unique dummy mobile number to satisfy unique constraint
      let mobileNumber = '';
      let isMobileUnique = false;
      while (!isMobileUnique) {
        mobileNumber = '9' + Math.floor(100000000 + Math.random() * 900000000);
        const existingMobile = await userRepository.findOne({ where: { mobileNumber } });
        if (!existingMobile) {
          isMobileUnique = true;
        }
      }

      // Securely hash password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with role hotel_admin
      const newUser = userRepository.create({
        name,
        email,
        mobileNumber,
        password: hashedPassword,
        role: UserRole.HOTEL_ADMIN,
      });

      const savedUser = await userRepository.save(newUser);

      // 2. Handle optional initial hotel assignment
      if (hotelId) {
        const hotel = await hotelRepository.findOne({ where: { id: hotelId } });
        if (!hotel) {
          throw new NotFoundException(`Selected hotel with ID ${hotelId} does not exist.`);
        }

        const newAssignment = hotelAdminRepository.create({
          userId: savedUser.id,
          hotelId: hotel.id,
          isActive: true,
        });

        await hotelAdminRepository.save(newAssignment);
      }

      // Return sanitized user details
      const { password: _, ...userWithoutPassword } = savedUser;
      return userWithoutPassword;
    });
  }

  async updateHotelAdmin(id: number, dto: UpdateHotelAdminDto) {
    const { name, email } = dto;

    const admin = await this.usersRepository.findOne({
      where: { id, role: UserRole.HOTEL_ADMIN },
    });

    if (!admin) {
      throw new NotFoundException(`Hotel administrator with ID ${id} not found.`);
    }

    if (email && email.trim() !== admin.email) {
      const emailExists = await this.usersRepository.findOne({
        where: { email: email.trim() },
      });
      if (emailExists) {
        throw new ConflictException('An account with this email already exists.');
      }
      admin.email = email.trim();
    }

    if (name && name.trim()) {
      admin.name = name.trim();
    }

    const updatedUser = await this.usersRepository.save(admin);
    const { password, ...sanitizedUser } = updatedUser;
    return sanitizedUser;
  }

  async getDeliveryPartnerCandidates() {
    const customers = await this.usersRepository.find({
      where: { role: UserRole.CUSTOMER },
    });

    const partnerRepository = this.dataSource.getRepository('DeliveryPartner');
    const partners = await partnerRepository.find({ select: ['userId'] }) as any[];
    const configuredUserIds = new Set(partners.map((p) => p.userId));

    const candidates = customers.filter((c) => !configuredUserIds.has(c.id));

    return candidates.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      mobileNumber: c.mobileNumber,
      role: c.role,
    }));
  }

  async registerPushToken(userId: number, pushToken: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.pushToken = pushToken || null;
    await this.usersRepository.save(user);
    return { success: true, message: 'Push token registered successfully' };
  }
}
