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
}
