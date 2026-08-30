import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { PushCampaignsService } from './push-campaigns.service';
import { CreatePushCampaignDto } from './dto/create-push-campaign.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'campaigns');

const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `campaign-${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
  },
});

@Controller('push-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN) // Only Super Admin has access to these management endpoints
export class PushCampaignsController {
  constructor(private readonly campaignsService: PushCampaignsService) {}

  @Get()
  getCampaigns() {
    return this.campaignsService.getCampaigns();
  }

  @Get(':id')
  getCampaignById(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.getCampaignById(id);
  }

  @Post()
  createCampaign(@Body() dto: CreatePushCampaignDto) {
    return this.campaignsService.createCampaign(dto);
  }

  @Patch(':id')
  updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePushCampaignDto,
  ) {
    return this.campaignsService.updateCampaign(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.deleteCampaign(id);
  }

  @Post('preview-count')
  @HttpCode(HttpStatus.OK)
  async previewAudienceCount(
    @Body() body: { targetAudience: string; selectedUserIds?: number[]; selectedCity?: string },
  ) {
    const count = await this.campaignsService.previewAudienceCount(
      body.targetAudience,
      body.selectedUserIds,
      body.selectedCity,
    );
    return { count };
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  sendCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body('idempotencyKey') idempotencyKey?: string,
  ) {
    return this.campaignsService.sendCampaign(id, idempotencyKey);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resumeCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.resumeCampaignLatest(id);
  }

  @Post('runs/:runId/resume')
  @HttpCode(HttpStatus.OK)
  resumeRun(@Param('runId', ParseIntPipe) runId: number) {
    return this.campaignsService.resumeCampaign(runId);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pauseCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.pauseCampaign(id);
  }

  @Post(':id/resume-recurring')
  @HttpCode(HttpStatus.OK)
  resumeRecurringCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.resumeRecurringCampaign(id);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stopCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.stopCampaign(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archiveCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.archiveCampaign(id);
  }

  @Post(':id/cancel-schedule')
  @HttpCode(HttpStatus.OK)
  cancelCampaignSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.cancelCampaignSchedule(id);
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.OK)
  cloneCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.cloneCampaign(id);
  }

  @Get('runs/:runId')
  getRunDetails(@Param('runId', ParseIntPipe) runId: number) {
    return this.campaignsService.getRunDetails(runId);
  }

  @Post('runs/:runId/check-receipts')
  @HttpCode(HttpStatus.OK)
  checkRunReceipts(@Param('runId', ParseIntPipe) runId: number) {
    return this.campaignsService.checkRunReceiptsManually(runId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: multerStorage }))
  uploadCampaignImage(@UploadedFile() file: any) {
    if (!file) {
      return { filename: null };
    }
    return { filename: file.filename };
  }
}
