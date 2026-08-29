import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandingService } from './branding.service';
import { Branding, BrandingAppType } from './branding.entity';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('branding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get('app-icons')
  async getAppIcons(): Promise<Branding[]> {
    return await this.brandingService.getAppIcons();
  }

  @Post('app-icons/:appType/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIcon(
    @Param('appType') appType: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return await this.brandingService.uploadIcon(validatedAppType, file);
  }

  @Post('app-icons/:appType/notification-icon/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNotificationIcon(
    @Param('appType') appType: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return await this.brandingService.uploadNotificationIcon(validatedAppType, file);
  }

  @Put('app-icons/:appType/app-name')
  async setAppName(
    @Param('appType') appType: string,
    @Body('appName') appName: string,
  ): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    if (!appName) {
      throw new BadRequestException('appName is required.');
    }
    return await this.brandingService.setAppName(validatedAppType, appName);
  }

  @Put('app-icons/:appType/transform')
  async updateTransform(
    @Param('appType') appType: string,
    @Body('scale') scale: number,
    @Body('offsetX') offsetX: number,
    @Body('offsetY') offsetY: number,
    @Body('padding') padding: number,
  ): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    return await this.brandingService.updateTransform(
      validatedAppType,
      scale,
      offsetX,
      offsetY,
      padding,
    );
  }

  @Put('app-icons/:appType/activate-for-next-update')
  async activateForNextUpdate(@Param('appType') appType: string): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    return await this.brandingService.activateForNextUpdate(validatedAppType);
  }

  @Delete('app-icons/:appType/pending')
  async deletePending(@Param('appType') appType: string): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    return await this.brandingService.deletePending(validatedAppType);
  }

  @Put('app-icons/:appType/mark-current')
  async markCurrent(@Param('appType') appType: string): Promise<Branding> {
    const validatedAppType = this.validateAppType(appType);
    return await this.brandingService.markCurrent(validatedAppType);
  }

  private validateAppType(appType: string): BrandingAppType {
    const upper = appType.toUpperCase();
    if (upper === BrandingAppType.CUSTOMER) {
      return BrandingAppType.CUSTOMER;
    }
    if (upper === BrandingAppType.DELIVERY_PARTNER) {
      return BrandingAppType.DELIVERY_PARTNER;
    }
    throw new BadRequestException(`Invalid appType: ${appType}. Must be customer or delivery_partner.`);
  }
}
