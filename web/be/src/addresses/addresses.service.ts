import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Address } from './address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: number, dto: CreateAddressDto): Promise<Address> {
    return await this.dataSource.transaction(async (manager) => {
      const activeCount = await manager.count(Address, {
        where: { userId, isActive: true },
      });

      const isDefault = activeCount === 0 ? true : (dto.isDefault ?? false);

      if (isDefault && activeCount > 0) {
        // Mark other active addresses of the same user as non-default
        await manager.update(
          Address,
          { userId, isActive: true },
          { isDefault: false },
        );
      }

      const address = manager.create(Address, {
        ...dto,
        userId,
        isDefault,
        isActive: true,
      });

      return await manager.save(Address, address);
    });
  }

  async findAll(userId: number): Promise<Address[]> {
    return await this.addressRepository.find({
      where: { userId, isActive: true },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(userId: number, id: number): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId, isActive: true },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    return address;
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId, isActive: true },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    let isDefault = dto.isDefault;

    // Prevent unsetting the default address if others exist
    if (isDefault === false && address.isDefault === true) {
      const activeCount = await this.addressRepository.count({
        where: { userId, isActive: true },
      });
      if (activeCount > 1) {
        throw new BadRequestException(
          'Cannot unset default address directly. Please mark another address as default instead.',
        );
      } else {
        isDefault = true; // Only active address remains default
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      if (isDefault === true && !address.isDefault) {
        await manager.update(
          Address,
          { userId, isActive: true },
          { isDefault: false },
        );
      }

      Object.assign(address, dto);
      if (isDefault !== undefined) {
        address.isDefault = isDefault;
      }

      return await manager.save(Address, address);
    });
  }

  async setDefault(userId: number, id: number): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId, isActive: true },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Address,
        { userId, isActive: true },
        { isDefault: false },
      );
      address.isDefault = true;
      return await manager.save(Address, address);
    });
  }

  async deactivate(userId: number, id: number): Promise<any> {
    const address = await this.addressRepository.findOne({
      where: { id, userId, isActive: true },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return await this.dataSource.transaction(async (manager) => {
      const wasDefault = address.isDefault;
      address.isActive = false;
      address.isDefault = false;
      await manager.save(Address, address);

      if (wasDefault) {
        // Find another active address to set as default
        const nextDefault = await manager.findOne(Address, {
          where: { userId, isActive: true },
          order: {
            updatedAt: 'DESC',
            createdAt: 'DESC',
          },
        });

        if (nextDefault) {
          nextDefault.isDefault = true;
          await manager.save(Address, nextDefault);
        }
      }

      return {
        message: 'Address removed successfully',
      };
    });
  }
}
