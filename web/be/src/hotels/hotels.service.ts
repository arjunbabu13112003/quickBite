import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hotel } from './hotel.entity';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { UpdateOpenStatusDto } from './dto/update-open-status.dto';

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
  ) {}

  async create(createHotelDto: CreateHotelDto): Promise<Hotel> {
    const minTime = createHotelDto.deliveryTimeMin;
    const maxTime = createHotelDto.deliveryTimeMax;

    if (
      minTime !== null &&
      minTime !== undefined &&
      maxTime !== null &&
      maxTime !== undefined &&
      maxTime < minTime
    ) {
      throw new BadRequestException(
        'deliveryTimeMax must be greater than or equal to deliveryTimeMin',
      );
    }

    const hotel = this.hotelRepository.create(createHotelDto);
    return await this.hotelRepository.save(hotel);
  }

  async findAllActive(): Promise<Hotel[]> {
    return await this.hotelRepository.find({
      where: { isActive: true },
      order: { id: 'DESC' },
    });
  }

  async findAllForAdmin(): Promise<Hotel[]> {
    return await this.hotelRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Hotel> {
    const hotel = await this.hotelRepository.findOne({ where: { id } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${id} not found`);
    }
    return hotel;
  }

  async update(id: number, updateHotelDto: UpdateHotelDto): Promise<Hotel> {
    const hotel = await this.findOne(id);

    const minTime =
      updateHotelDto.deliveryTimeMin !== undefined
        ? updateHotelDto.deliveryTimeMin
        : hotel.deliveryTimeMin;
    const maxTime =
      updateHotelDto.deliveryTimeMax !== undefined
        ? updateHotelDto.deliveryTimeMax
        : hotel.deliveryTimeMax;

    if (
      minTime !== null &&
      minTime !== undefined &&
      maxTime !== null &&
      maxTime !== undefined &&
      maxTime < minTime
    ) {
      throw new BadRequestException(
        'deliveryTimeMax must be greater than or equal to deliveryTimeMin',
      );
    }

    Object.assign(hotel, updateHotelDto);
    return await this.hotelRepository.save(hotel);
  }

  async deactivate(id: number): Promise<Hotel> {
    const hotel = await this.findOne(id);
    hotel.isActive = false;
    return await this.hotelRepository.save(hotel);
  }

  async updateOpenStatus(
    id: number,
    updateOpenStatusDto: UpdateOpenStatusDto,
  ): Promise<Hotel> {
    const hotel = await this.findOne(id);

    if (updateOpenStatusDto.isOpen !== undefined) {
      hotel.isOpen = updateOpenStatusDto.isOpen;
    }

    if (updateOpenStatusDto.acceptsOrders !== undefined) {
      hotel.acceptsOrders = updateOpenStatusDto.acceptsOrders;
    }

    return await this.hotelRepository.save(hotel);
  }

  async updateProfile(id: number, updateProfileDto: any): Promise<Hotel> {
    const hotel = await this.findOne(id);

    // Validation
    if (updateProfileDto.name !== undefined) {
      if (!updateProfileDto.name || !updateProfileDto.name.trim()) {
        throw new BadRequestException('Restaurant Name is required and cannot be empty.');
      }
      if (updateProfileDto.name.length > 255) {
        throw new BadRequestException('Restaurant Name must be less than 255 characters.');
      }
    }

    if (updateProfileDto.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateProfileDto.email) || updateProfileDto.email.length > 255) {
        throw new BadRequestException('Please provide a valid email address.');
      }
    }

    const phoneRegex = /^[+]?[0-9\s-]{7,20}$/;
    if (updateProfileDto.phoneNumber) {
      if (!phoneRegex.test(updateProfileDto.phoneNumber)) {
        throw new BadRequestException('Primary Phone Number is invalid.');
      }
    }
    if (updateProfileDto.alternatePhoneNumber) {
      if (!phoneRegex.test(updateProfileDto.alternatePhoneNumber)) {
        throw new BadRequestException('Alternate Phone Number is invalid.');
      }
    }

    if (updateProfileDto.pincode) {
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(updateProfileDto.pincode)) {
        throw new BadRequestException('Pincode must be a valid 6-digit number.');
      }
    }

    if (updateProfileDto.latitude !== undefined && updateProfileDto.latitude !== null) {
      const lat = parseFloat(updateProfileDto.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90.');
      }
    }

    if (updateProfileDto.longitude !== undefined && updateProfileDto.longitude !== null) {
      const lng = parseFloat(updateProfileDto.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180.');
      }
    }

    if (updateProfileDto.averagePreparationTime !== undefined && updateProfileDto.averagePreparationTime !== null) {
      const prep = parseInt(updateProfileDto.averagePreparationTime, 10);
      if (isNaN(prep) || prep < 0) {
        throw new BadRequestException('Average Preparation Time must be a positive integer.');
      }
    }

    if (updateProfileDto.estimatedDeliveryTime !== undefined && updateProfileDto.estimatedDeliveryTime !== null) {
      const del = parseInt(updateProfileDto.estimatedDeliveryTime, 10);
      if (isNaN(del) || del < 0) {
        throw new BadRequestException('Estimated Delivery Time must be a positive integer.');
      }
    }

    if (updateProfileDto.deliveryRadiusKm !== undefined && updateProfileDto.deliveryRadiusKm !== null) {
      const radius = parseFloat(updateProfileDto.deliveryRadiusKm);
      if (isNaN(radius) || radius < 0) {
        throw new BadRequestException('Delivery Radius must be greater than or equal to 0.');
      }
    }

    if (updateProfileDto.minimumOrderAmount !== undefined && updateProfileDto.minimumOrderAmount !== null) {
      const minOrder = parseFloat(updateProfileDto.minimumOrderAmount);
      if (isNaN(minOrder) || minOrder < 0) {
        throw new BadRequestException('Minimum Order Amount must be greater than or equal to 0.');
      }
    }

    // Save fields
    const fields = [
      'name', 'description', 'cuisines', 'restaurantType', 'averagePreparationTime',
      'minimumOrderAmount', 'ownerName', 'phoneNumber', 'alternatePhoneNumber', 'email',
      'address', 'landmark', 'city', 'district', 'state', 'pincode', 'latitude', 'longitude',
      'isDeliveryAvailable', 'estimatedDeliveryTime', 'deliveryRadiusKm', 'legalName',
      'fssaiNumber', 'gstNumber', 'operatingHours', 'gallery', 'logo', 'image'
    ];

    for (const field of fields) {
      if (updateProfileDto[field] !== undefined) {
        hotel[field] = updateProfileDto[field];
      }
    }

    return await this.hotelRepository.save(hotel);
  }
}
