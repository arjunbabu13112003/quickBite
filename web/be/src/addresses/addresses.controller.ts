import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(@Body() dto: CreateAddressDto, @Request() req) {
    return this.addressesService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.addressesService.findAll(req.user.userId);
  }

  @Get(':addressId')
  findOne(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Request() req,
  ) {
    return this.addressesService.findOne(req.user.userId, addressId);
  }

  @Patch(':addressId')
  update(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
    @Request() req,
  ) {
    return this.addressesService.update(req.user.userId, addressId, dto);
  }

  @Patch(':addressId/default')
  setDefault(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Request() req,
  ) {
    return this.addressesService.setDefault(req.user.userId, addressId);
  }

  @Delete(':addressId')
  deactivate(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Request() req,
  ) {
    return this.addressesService.deactivate(req.user.userId, addressId);
  }
}
