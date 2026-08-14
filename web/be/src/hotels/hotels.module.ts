import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hotel } from './hotel.entity';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { HotelAdminsModule } from '../hotel-admins/hotel-admins.module';

@Module({
  imports: [TypeOrmModule.forFeature([Hotel]), HotelAdminsModule],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
