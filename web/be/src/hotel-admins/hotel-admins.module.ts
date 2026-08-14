import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelAdmin } from './hotel-admin.entity';
import { User } from '../users/user.entity';
import { Hotel } from '../hotels/hotel.entity';
import { HotelAdminsService } from './hotel-admins.service';
import { HotelAdminsController } from './hotel-admins.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HotelAdmin, User, Hotel])],
  controllers: [HotelAdminsController],
  providers: [HotelAdminsService],
  exports: [HotelAdminsService],
})
export class HotelAdminsModule {}
