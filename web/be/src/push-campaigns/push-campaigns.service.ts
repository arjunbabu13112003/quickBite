import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Brackets, IsNull, Not, LessThanOrEqual, Like } from 'typeorm';
import { PushCampaign } from './push-campaign.entity';
import { PushCampaignRecipient } from './push-campaign-recipient.entity';
import { PushCampaignRun } from './push-campaign-run.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { Address } from '../addresses/address.entity';
import { UserRole } from '../users/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePushCampaignDto } from './dto/create-push-campaign.dto';
import { DevicePushToken, AppType } from '../users/device-push-token.entity';
import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import { Jimp } from 'jimp';

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}



// Recurrence helper functions
export function getUtcTimestamp(localDateStr: string, localTimeStr: string, timezone: string): Date {
  const dt = DateTime.fromSQL(`${localDateStr} ${localTimeStr}`, { zone: timezone });
  if (!dt.isValid) {
    throw new BadRequestException(`Invalid local date/time or timezone: ${dt.invalidReason}`);
  }
  return dt.toJSDate();
}

export function calculateNextOccurrence(campaign: {
  repeatPattern?: string;
  repeatDays?: string[];
  repeatInterval?: number;
  sendTime?: string;
  timezone?: string;
  startDate?: Date;
}, current: Date): Date {
  const tz = campaign.timezone || 'UTC';
  const repeatPattern = campaign.repeatPattern || 'DAILY';
  const repeatInterval = campaign.repeatInterval || 1;
  const repeatDays = campaign.repeatDays || [];
  const sendTime = campaign.sendTime || '18:00';
  
  let currentDt = DateTime.fromJSDate(current, { zone: tz });
  
  if (repeatPattern === 'DAILY') {
    return currentDt.plus({ days: repeatInterval }).toJSDate();
  }
  
  let checkDt = currentDt.plus({ days: 1 });
  for (let i = 0; i < 366; i++) {
    const weekdayName = checkDt.toFormat('EEEE');
    let isMatch = false;
    
    if (repeatPattern === 'WEEKLY') {
      const startDt = DateTime.fromJSDate(campaign.startDate || new Date(), { zone: tz });
      if (checkDt.weekday === startDt.weekday) {
        const diffWeeks = Math.round(checkDt.startOf('week').diff(startDt.startOf('week'), 'weeks').weeks);
        if (diffWeeks % repeatInterval === 0) {
          isMatch = true;
        }
      }
    } else if (repeatPattern === 'SELECTED_DAYS') {
      if (repeatDays.includes(weekdayName)) {
        const startDt = DateTime.fromJSDate(campaign.startDate || new Date(), { zone: tz });
        const diffWeeks = Math.round(checkDt.startOf('week').diff(startDt.startOf('week'), 'weeks').weeks);
        if (diffWeeks % repeatInterval === 0) {
          isMatch = true;
        }
      }
    }
    
    if (isMatch) {
      const [hours, minutes] = sendTime.split(':').map(Number);
      const occurrenceDt = checkDt.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
      return occurrenceDt.toJSDate();
    }
    
    checkDt = checkDt.plus({ days: 1 });
  }
  
  return currentDt.plus({ days: 1 }).toJSDate();
}

@Injectable()
export class PushCampaignsService implements OnModuleInit, OnModuleDestroy {
  private schedulerIntervalId: NodeJS.Timeout | null = null;
  private receiptCheckerIntervalId: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(PushCampaign)
    private readonly campaignRepository: Repository<PushCampaign>,
    @InjectRepository(PushCampaignRecipient)
    private readonly recipientRepository: Repository<PushCampaignRecipient>,
    @InjectRepository(PushCampaignRun)
    private readonly runRepository: Repository<PushCampaignRun>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    @InjectRepository(DevicePushToken)
    private readonly devicePushTokenRepository: Repository<DevicePushToken>,
  ) {}

  onModuleInit() {
    // Prevent double intervals under hot-reload
    if (!this.schedulerIntervalId) {
      console.log('[PUSH SCHEDULER] Initializing 60-second periodic poll loop');
      this.schedulerIntervalId = setInterval(() => {
        this.checkAndSendScheduledCampaigns().catch(err => {
          console.error('[PUSH SCHEDULER ERROR]', err.message || err);
        });
      }, 60000);
    }
    if (!this.receiptCheckerIntervalId) {
      console.log('[PUSH RECEIPTS] Initializing 60-second periodic receipt check loop');
      this.receiptCheckerIntervalId = setInterval(() => {
        this.checkPendingReceipts().catch(err => {
          console.error('[PUSH RECEIPTS ERROR]', err.message || err);
        });
      }, 60000);
    }
  }

  onModuleDestroy() {
    if (this.schedulerIntervalId) {
      console.log('[PUSH SCHEDULER] Destroying periodic poll loop');
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    if (this.receiptCheckerIntervalId) {
      console.log('[PUSH RECEIPTS] Destroying periodic receipt check loop');
      clearInterval(this.receiptCheckerIntervalId);
      this.receiptCheckerIntervalId = null;
    }
  }

  async getCampaigns(): Promise<PushCampaign[]> {
    return await this.campaignRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getCampaignById(id: number): Promise<any> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    const runs = await this.runRepository.find({
      where: { campaignId: id },
      order: { scheduledFor: 'DESC' },
    });

    const runsWithAnalytics = [];
    for (const run of runs) {
      const receiptCounts = await this.recipientRepository.createQueryBuilder('rec')
        .select('rec.receiptStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('rec.runId = :runId', { runId: run.id })
        .groupBy('rec.receiptStatus')
        .getRawMany();

      const counts: Record<string, number> = {
        PENDING: 0,
        OK: 0,
        ERROR: 0,
        UNAVAILABLE: 0,
        NULL: 0,
      };
      for (const row of receiptCounts) {
        const statusKey = row.status || 'NULL';
        counts[statusKey] = parseInt(row.count, 10);
      }

      const ticketInvalidCount = await this.recipientRepository.count({
        where: {
          runId: run.id,
          failureType: 'PERMANENT',
          errorMessage: Like('%DeviceNotRegistered%'),
        }
      });
      const receiptInvalidCount = await this.recipientRepository.count({
        where: {
          runId: run.id,
          receiptStatus: 'ERROR',
          receiptErrorCode: 'DeviceNotRegistered',
        }
      });

      runsWithAnalytics.push({
        ...run,
        receiptPendingCount: counts.PENDING,
        receiptOkCount: counts.OK,
        receiptErrorCount: counts.ERROR,
        receiptUnavailableCount: counts.UNAVAILABLE,
        invalidTokensCount: ticketInvalidCount + receiptInvalidCount,
      });
    }

    return { ...campaign, runs: runsWithAnalytics };
  }

  async createCampaign(dto: CreatePushCampaignDto): Promise<PushCampaign> {
    await this.validateTapAction(dto.tapAction, dto.tapActionArgument);
    const normalized = await this.validateAndNormalizeImage(dto.imageUrl);

    let scheduledAtUtc: Date | undefined = undefined;
    let nextRunAt: Date | undefined = undefined;
    let campaignStatus = 'Draft';

    if (dto.scheduleType === 'LATER') {
      if (!dto.scheduledAt) {
        throw new BadRequestException('scheduledAt is required when scheduleType is LATER');
      }
      scheduledAtUtc = new Date(dto.scheduledAt);
      if (isNaN(scheduledAtUtc.getTime())) {
        throw new BadRequestException('Invalid scheduledAt timestamp format');
      }
      if (scheduledAtUtc.getTime() <= Date.now()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
      campaignStatus = 'Scheduled/Active';
    } else if (dto.scheduleType === 'REPEAT') {
      if (!dto.startDate || !dto.sendTime || !dto.timezone) {
        throw new BadRequestException('startDate, sendTime, and timezone are required for REPEAT campaigns');
      }
      campaignStatus = 'Scheduled/Active';
      
      const initialUtc = getUtcTimestamp(dto.startDate, dto.sendTime, dto.timezone);
      let firstRun = initialUtc;
      const dummyCampObj = {
        repeatPattern: dto.repeatPattern,
        repeatDays: dto.repeatDays,
        repeatInterval: dto.repeatInterval || 1,
        sendTime: dto.sendTime,
        timezone: dto.timezone,
        startDate: new Date(dto.startDate),
      };
      
      while (firstRun.getTime() < Date.now()) {
        firstRun = calculateNextOccurrence(dummyCampObj, firstRun);
      }
      nextRunAt = firstRun;
    }

    const campaign = this.campaignRepository.create({
      title: dto.title,
      body: dto.body,
      imageUrl: normalized.imageUrl || dto.imageUrl || null,
      notificationImageUrl: normalized.notificationImageUrl || null,
      targetAudience: dto.targetAudience,
      selectedUserIds: dto.selectedUserIds || null,
      selectedCity: dto.selectedCity || null,
      tapAction: dto.tapAction,
      tapActionArgument: dto.tapActionArgument || null,
      scheduleType: dto.scheduleType,
      scheduledAt: scheduledAtUtc,
      repeatPattern: dto.repeatPattern || null,
      repeatDays: dto.repeatDays || null,
      repeatInterval: dto.repeatInterval || 1,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      sendTime: dto.sendTime || null,
      timezone: dto.timezone || 'UTC',
      endDateType: dto.endDateType || 'NEVER',
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      endAfterSendsCount: dto.endAfterSendsCount || null,
      recurrenceStatus: dto.scheduleType === 'REPEAT' ? 'Active' : 'Active',
      nextRunAt: nextRunAt || null,
      status: campaignStatus,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // If LATER, immediately create the Scheduled PushCampaignRun
    if (dto.scheduleType === 'LATER' && scheduledAtUtc) {
      await this.runRepository.save(
        this.runRepository.create({
          campaignId: savedCampaign.id,
          scheduledFor: scheduledAtUtc,
          status: 'Scheduled',
          triggerType: 'SCHEDULED',
          occurrenceKey: `${savedCampaign.id}_${scheduledAtUtc.toISOString()}`,
        })
      );
    }

    return savedCampaign;
  }

  async updateCampaign(id: number, dto: CreatePushCampaignDto): Promise<PushCampaign> {
    const campaign = await this.getCampaignRepository().findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    if (campaign.status === 'Sending' || campaign.status === 'Sent') {
      throw new ConflictException(`Campaigns in ${campaign.status} status are immutable`);
    }

    await this.validateTapAction(dto.tapAction, dto.tapActionArgument);
    const normalized = await this.validateAndNormalizeImage(dto.imageUrl);

    let scheduledAtUtc: Date | undefined = undefined;
    let nextRunAt: Date | undefined = undefined;
    let campaignStatus = 'Draft';

    if (dto.scheduleType === 'LATER') {
      if (!dto.scheduledAt) {
        throw new BadRequestException('scheduledAt is required when scheduleType is LATER');
      }
      scheduledAtUtc = new Date(dto.scheduledAt);
      if (isNaN(scheduledAtUtc.getTime())) {
        throw new BadRequestException('Invalid scheduledAt timestamp format');
      }
      if (scheduledAtUtc.getTime() <= Date.now()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
      campaignStatus = 'Scheduled/Active';
    } else if (dto.scheduleType === 'REPEAT') {
      if (!dto.startDate || !dto.sendTime || !dto.timezone) {
        throw new BadRequestException('startDate, sendTime, and timezone are required for REPEAT campaigns');
      }
      campaignStatus = 'Scheduled/Active';
      
      const initialUtc = getUtcTimestamp(dto.startDate, dto.sendTime, dto.timezone);
      let firstRun = initialUtc;
      const dummyCampObj = {
        repeatPattern: dto.repeatPattern,
        repeatDays: dto.repeatDays,
        repeatInterval: dto.repeatInterval || 1,
        sendTime: dto.sendTime,
        timezone: dto.timezone,
        startDate: new Date(dto.startDate),
      };
      
      while (firstRun.getTime() < Date.now()) {
        firstRun = calculateNextOccurrence(dummyCampObj, firstRun);
      }
      nextRunAt = firstRun;
    }

    // Clean up any old pending Scheduled runs since scheduling changed
    const oldRuns = await this.runRepository.find({
      where: { campaignId: campaign.id, status: 'Scheduled' },
    });
    for (const r of oldRuns) {
      await this.runRepository.remove(r);
    }

    campaign.title = dto.title;
    campaign.body = dto.body;
    campaign.imageUrl = normalized.imageUrl || dto.imageUrl || null;
    campaign.notificationImageUrl = normalized.notificationImageUrl || null;
    campaign.targetAudience = dto.targetAudience;
    campaign.selectedUserIds = dto.selectedUserIds || null;
    campaign.selectedCity = dto.selectedCity || null;
    campaign.tapAction = dto.tapAction;
    campaign.tapActionArgument = dto.tapActionArgument || null;
    campaign.scheduleType = dto.scheduleType;
    campaign.scheduledAt = scheduledAtUtc || null;
    campaign.repeatPattern = dto.repeatPattern || null;
    campaign.repeatDays = dto.repeatDays || null;
    campaign.repeatInterval = dto.repeatInterval || 1;
    campaign.startDate = dto.startDate ? new Date(dto.startDate) : null;
    campaign.sendTime = dto.sendTime || null;
    campaign.timezone = dto.timezone || 'UTC';
    campaign.endDateType = dto.endDateType || 'NEVER';
    campaign.endDate = dto.endDate ? new Date(dto.endDate) : null;
    campaign.endAfterSendsCount = dto.endAfterSendsCount || null;
    campaign.nextRunAt = nextRunAt || null;
    campaign.status = campaignStatus;

    const savedCampaign = await this.campaignRepository.save(campaign);

    // If new schedule is LATER, recreate Scheduled run
    if (dto.scheduleType === 'LATER' && scheduledAtUtc) {
      await this.runRepository.save(
        this.runRepository.create({
          campaignId: savedCampaign.id,
          scheduledFor: scheduledAtUtc,
          status: 'Scheduled',
          triggerType: 'SCHEDULED',
          occurrenceKey: `${savedCampaign.id}_${scheduledAtUtc.toISOString()}`,
        })
      );
    }

    return savedCampaign;
  }

  // Private helper to query repo directly without relations fallback
  private getCampaignRepository() {
    return this.campaignRepository;
  }

  async deleteCampaign(id: number): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    const runCount = await this.runRepository.count({ where: { campaignId: id } });
    if (runCount > 0) {
      throw new ConflictException('Campaign has run history and cannot be deleted. Please archive it instead.');
    }
    if (campaign.status === 'Sending' || campaign.status === 'Sent') {
      throw new ConflictException(`Campaigns in ${campaign.status} status cannot be deleted`);
    }
    await this.campaignRepository.delete({ id });
  }

  async cancelCampaignSchedule(id: number): Promise<PushCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    if (campaign.status !== 'Scheduled/Active' && campaign.status !== 'Scheduled') {
      throw new BadRequestException('Only scheduled campaigns can have their schedule cancelled');
    }

    await this.dataSource.transaction(async (manager) => {
      const pendingRun = await manager.findOne(PushCampaignRun, {
        where: { campaignId: id, status: 'Scheduled' },
      });
      if (pendingRun) {
        pendingRun.status = 'Cancelled';
        pendingRun.errorMessage = 'Schedule cancelled by administrator';
        await manager.save(PushCampaignRun, pendingRun);
      }
      campaign.status = 'Cancelled';
      await manager.save(PushCampaign, campaign);
    });

    return campaign;
  }

  async previewAudienceCount(targetAudience: string, selectedUserIds?: number[], selectedCity?: string): Promise<number> {
    const users = await this.resolveAudience({ targetAudience, selectedUserIds, selectedCity });
    return users.length;
  }

  // Operation Pause: Pause future occurrences
  async pauseCampaign(id: number): Promise<PushCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    campaign.recurrenceStatus = 'Paused';
    campaign.nextRunAt = null; // Clear nextRunAt when paused
    return await this.campaignRepository.save(campaign);
  }

  // Operation Resume: Resume future schedule
  async resumeRecurringCampaign(id: number): Promise<PushCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    
    // Find the next valid future occurrence starting from NOW
    const now = new Date();
    const tz = campaign.timezone || 'UTC';
    
    // Construct local calendar date and send time starting from NOW
    const nowDt = DateTime.now().setZone(tz);
    const startDateStr = nowDt.toFormat('yyyy-MM-dd');
    const sendTime = campaign.sendTime || '18:00';
    
    const initialUtc = getUtcTimestamp(startDateStr, sendTime, tz);
    let firstRun = initialUtc;
    const dummyCampObj = {
      repeatPattern: campaign.repeatPattern,
      repeatDays: campaign.repeatDays,
      repeatInterval: campaign.repeatInterval || 1,
      sendTime: campaign.sendTime,
      timezone: campaign.timezone,
      startDate: campaign.startDate || new Date(),
    };
    
    while (firstRun.getTime() < now.getTime()) {
      firstRun = calculateNextOccurrence(dummyCampObj, firstRun);
    }
    
    campaign.recurrenceStatus = 'Active';
    campaign.nextRunAt = firstRun;
    
    return await this.campaignRepository.save(campaign);
  }

  // Operation Stop: Permanent recurrence termination
  async stopCampaign(id: number): Promise<PushCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    campaign.recurrenceStatus = 'Stopped';
    campaign.nextRunAt = null;
    return await this.campaignRepository.save(campaign);
  }

  // Operation Archive: Archive campaign
  async archiveCampaign(id: number): Promise<PushCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    
    // Do not archive an actively Sending campaign run in a way that breaks execution
    const activeRuns = await this.runRepository.count({
      where: { campaignId: id, status: 'Sending' },
    });
    if (activeRuns > 0) {
      throw new ConflictException('Cannot archive campaign while it has actively sending runs.');
    }
    
    campaign.isArchived = true;
    return await this.campaignRepository.save(campaign);
  }

  // Operation Clone (Send Again)
  async cloneCampaign(id: number): Promise<PushCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    
    // Clones the previous campaign's configuration into a new Draft campaign
    const cloned = this.campaignRepository.create({
      title: campaign.title,
      body: campaign.body,
      imageUrl: campaign.imageUrl,
      notificationImageUrl: campaign.notificationImageUrl,
      targetAudience: campaign.targetAudience,
      selectedUserIds: campaign.selectedUserIds,
      selectedCity: campaign.selectedCity,
      tapAction: campaign.tapAction,
      tapActionArgument: campaign.tapActionArgument,
      scheduleType: 'NOW',
      scheduledAt: null,
      repeatPattern: null,
      repeatDays: null,
      repeatInterval: 1,
      startDate: null,
      sendTime: null,
      timezone: 'UTC',
      endDateType: 'NEVER',
      endDate: null,
      endAfterSendsCount: null,
      recurrenceStatus: 'Active',
      nextRunAt: null,
      status: 'Draft',
    });
    
    return await this.campaignRepository.save(cloned);
  }

  // Send Now on a Draft or Scheduled campaign
  async sendCampaign(id: number, idempotencyKey?: string): Promise<{ success: boolean; message: string }> {
    // Check manual action idempotency first
    if (idempotencyKey) {
      const existingRun = await this.runRepository.findOne({ where: { idempotencyKey } });
      if (existingRun) {
        console.log(`[PUSH] Idempotency match found for key: ${idempotencyKey}. Skipping duplicate run creation.`);
        return { success: true, message: 'Run already claimed (idempotent)' };
      }
    }

    // Wrap the Send Now operation in a transaction to prevent races and handle atomicity
    let runIdToExecute: number;

    await this.dataSource.transaction(async (manager) => {
      // Re-verify campaign state
      const campaign = await manager.createQueryBuilder(PushCampaign, 'campaign')
        .setLock('pessimistic_write')
        .where('campaign.id = :id', { id })
        .getOne();

      if (!campaign) {
        throw new NotFoundException(`Campaign #${id} not found`);
      }

      if (campaign.status === 'Sending' || campaign.status === 'Sent') {
        throw new ConflictException('Campaign is already Sent, Sending, or locked in another process');
      }

      if (campaign.status === 'Scheduled/Active' && campaign.scheduleType === 'LATER') {
        // Scheduled one-time campaign Send Now flow:
        // 1. Locate the pending Scheduled run
        const pendingRun = await manager.findOne(PushCampaignRun, {
          where: { campaignId: id, status: 'Scheduled' },
        });
        
        if (pendingRun) {
          // 2. Mark pending run Cancelled
          pendingRun.status = 'Cancelled';
          await manager.save(PushCampaignRun, pendingRun);
        }
      }

      // 3. Create the idempotent MANUAL run
      const manualRun = manager.create(PushCampaignRun, {
        campaignId: id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        heartbeatAt: new Date(),
        status: 'Sending',
        triggerType: 'MANUAL',
        idempotencyKey: idempotencyKey || undefined,
      });

      const savedRun = await manager.save(PushCampaignRun, manualRun);
      runIdToExecute = savedRun.id;

      // 4. Update campaign execution state
      campaign.status = 'Sending';
      campaign.sendingStartedAt = new Date();
      await manager.save(PushCampaign, campaign);
    });

    // Run background broadcast asynchronously
    const run = await this.runRepository.findOne({ where: { id: runIdToExecute }, relations: ['campaign'] });
    this.broadcastRunBackground(run);

    return { success: true, message: 'Campaign claimed successfully and broadcast initiated' };
  }

  // Resume a run (stale checks, heartbeats)
  async resumeCampaign(runId: number): Promise<{ success: boolean; message: string }> {
    const run = await this.runRepository.findOne({ where: { id: runId }, relations: ['campaign'] });
    if (!run) {
      throw new NotFoundException(`Run #${runId} not found`);
    }

    if (run.status === 'Sending') {
      const staleThresholdMs = 10 * 60 * 1000; // 10 minutes stale
      const referenceTime = run.heartbeatAt || run.startedAt || run.createdAt;
      const isStale = (Date.now() - referenceTime.getTime()) > staleThresholdMs;

      if (!isStale) {
        throw new ConflictException('Run is actively sending. Please wait.');
      }
    } else if (run.status !== 'Failed') {
      throw new ConflictException('Run must be in Sending (stale) or Failed status to resume');
    }

    // Atomically update run status to Sending
    run.status = 'Sending';
    run.startedAt = new Date();
    run.heartbeatAt = new Date();
    await this.runRepository.save(run);

    // Stale processing recipients are marked as unknown (RETRYABLE classification fallback)
    await this.recipientRepository.update(
      { runId: run.id, status: 'processing' },
      { status: 'unknown', errorMessage: 'Server crashed/interrupted during active dispatch' }
    );

    // Trigger async broadcast in background thread
    this.broadcastRunBackground(run);

    return { success: true, message: 'Run resume process initiated' };
  }

  async resumeCampaignLatest(campaignId: number): Promise<{ success: boolean; message: string }> {
    const run = await this.runRepository.findOne({
      where: { campaignId },
      order: { id: 'DESC' },
    });
    if (!run) {
      throw new NotFoundException(`No runs found for campaign #${campaignId}`);
    }
    return this.resumeCampaign(run.id);
  }

  async executeRun(runId: number): Promise<{ success: boolean; message: string }> {
    const updateResult = await this.runRepository.update(
      { id: runId, status: 'Scheduled' },
      { status: 'Sending', startedAt: new Date(), heartbeatAt: new Date() }
    );

    if (updateResult.affected === 0) {
      throw new ConflictException('Run is already Sent, Sending, Cancelled, or locked in another process');
    }

    const run = await this.runRepository.findOne({ where: { id: runId }, relations: ['campaign'] });
    if (!run) {
      throw new NotFoundException(`Run #${runId} not found`);
    }

    // Trigger async broadcast in background
    this.broadcastRunBackground(run);

    return { success: true, message: 'Run claimed successfully and broadcast initiated' };
  }

  private broadcastRunBackground(run: PushCampaignRun) {
    (async () => {
      const campaign = run.campaign;
      try {
        if (!campaign) {
          throw new Error('Associated campaign not found or has been deleted');
        }

        // Safe logging of push image info
        const resolvedImageUrl = campaign.notificationImageUrl || await this.resolvePushImageUrl(campaign.imageUrl);
        
        let storedPresent = campaign.imageUrl ? 'YES' : 'NO';
        let resolvedPresent = resolvedImageUrl ? 'YES' : 'NO';
        let richIncluded = (resolvedImageUrl && resolvedImageUrl.trim() !== '') ? 'YES' : 'NO';
        let protocol = 'none';
        let host = 'none';
        let contentType = 'none';
        let byteSize = 'none';

        if (resolvedImageUrl) {
          try {
            const parsed = new URL(resolvedImageUrl);
            protocol = parsed.protocol.replace(':', '');
            host = parsed.hostname;
            
            // Fetch headers to get content-type and content-length
            const headRes = await fetch(resolvedImageUrl, { method: 'HEAD' });
            const headLength = headRes.headers.get('content-length');
            if (headRes.ok && headLength && headLength !== '0') {
              contentType = headRes.headers.get('content-type') || 'none';
              byteSize = headLength;
            } else {
              const getRes = await fetch(resolvedImageUrl, { method: 'GET' });
              if (getRes.ok) {
                contentType = getRes.headers.get('content-type') || 'none';
                byteSize = getRes.headers.get('content-length') || 'none';
              }
            }
          } catch (e) {
            console.error('[PUSH IMAGE DEBUG] Failed to fetch headers:', e.message || e);
          }
        }

        console.log(`[PUSH IMAGE DEBUG] campaignId: ${campaign.id}`);
        console.log(`[PUSH IMAGE DEBUG] stored image present: ${storedPresent}`);
        console.log(`[PUSH IMAGE DEBUG] resolved image present: ${resolvedPresent}`);
        console.log(`[PUSH IMAGE DEBUG] richContent included: ${richIncluded}`);
        console.log(`[PUSH IMAGE DEBUG] protocol: ${protocol}`);
        console.log(`[PUSH IMAGE DEBUG] host: ${host}`);
        console.log(`[PUSH IMAGE DEBUG] content type: ${contentType}`);
        console.log(`[PUSH IMAGE DEBUG] byte size: ${byteSize}`);

        if (resolvedImageUrl) {
          console.log(`[PUSH IMAGE] rich image included: YES`);
          console.log(`[PUSH IMAGE] URL host: ${host}`);
        } else {
          console.log(`[PUSH IMAGE] rich image included: NO`);
        }

        // 1. Resolve targeted audience
        const users = await this.resolveAudience(campaign);

        // 2. Persist CustomerNotification inbox records for all targeted users idempotently (with runId!)
        for (const u of users) {
          await this.notificationsService.createCustomerNotification(
            u.id,
            campaign.id,
            run.id,
            campaign.title,
            campaign.body,
            'promotion',
            { action: campaign.tapAction, argument: campaign.tapActionArgument }
          ).catch(() => {}); // Catch and ignore unique constraint violation
        }

        // 3. Create PushCampaignRecipient rows as 'pending' BEFORE dispatching push requests
        for (const u of users) {
          const exists = await this.recipientRepository.findOne({
            where: { runId: run.id, userId: u.id },
          });
          if (!exists) {
            const rec = this.recipientRepository.create({
              runId: run.id,
              campaignId: campaign.id,
              userId: u.id,
              pushToken: u.pushToken || null,
              devicePushTokenId: (u as any).devicePushTokenId || null,
              status: u.pushToken ? 'pending' : 'no-token',
            });
            await this.recipientRepository.save(rec).catch(() => {});
          }
        }

        // 4. Fetch pending or retryable failed recipients for this run session (skip submitted, unknown, permanent failures)
        const activeRecipients = await this.recipientRepository.find({
          where: [
            { runId: run.id, status: 'pending' },
            { runId: run.id, status: 'failed', failureType: 'RETRYABLE' }
          ],
        });

        // Split into chunks of 100 (Expo push API chunk limit)
        const chunkSize = 100;
        for (let i = 0; i < activeRecipients.length; i += chunkSize) {
          const chunk = activeRecipients.slice(i, i + chunkSize);
          const chunkUserIds = chunk.map(r => r.userId);

          // Pre-validate tokens at dispatch time
          const tokenIds = chunk.map(r => r.devicePushTokenId).filter((id): id is number => !!id);
          let validTokenIds = new Set<number>();
          if (tokenIds.length > 0) {
            const dbTokens = await this.devicePushTokenRepository.find({
              where: {
                id: In(tokenIds),
                isActive: true,
                appType: AppType.CUSTOMER,
              }
            });
            validTokenIds = new Set(dbTokens.map(t => t.id));
          }

          const messages: any[] = [];
          const recipientMappings: Array<{ recipientId: number; devicePushTokenId: number; token: string }> = [];

          for (const r of chunk) {
            if (!r.pushToken || r.pushToken.trim() === '') {
              continue;
            }
            if (!r.devicePushTokenId || !validTokenIds.has(r.devicePushTokenId)) {
              await this.recipientRepository.update(
                { id: r.id },
                { 
                  status: 'failed', 
                  failureType: 'PERMANENT', 
                  errorMessage: 'Device token is inactive or invalid at dispatch time',
                  processedAt: new Date()
                }
              );
              continue;
            }
            const messagePayload: any = {
              to: r.pushToken.trim(),
              title: campaign.title,
              body: campaign.body,
              sound: "quickbite_alert.wav",
              priority: "high",
              channelId: "quickbite-alerts-v5",
              data: {
                action: campaign.tapAction,
                argument: campaign.tapActionArgument,
              },
            };

            if (resolvedImageUrl) {
              messagePayload.richContent = {
                image: resolvedImageUrl,
              };
              messagePayload.image = resolvedImageUrl;
              messagePayload.data.image = resolvedImageUrl;
            }

            messages.push(messagePayload);
            recipientMappings.push({
              recipientId: r.id,
              devicePushTokenId: r.devicePushTokenId,
              token: r.pushToken.trim(),
            });
          }

          if (messages.length === 0) {
            // Mark remaining unprocessed chunk user rows without valid tokens as 'no-token' if they didn't fail
            const remainingUserIds = chunk
              .filter(r => (!r.pushToken || r.pushToken.trim() === '') && r.status !== 'failed')
              .map(r => r.userId);
            if (remainingUserIds.length > 0) {
              await this.recipientRepository.update(
                { runId: run.id, userId: In(remainingUserIds) },
                { status: 'no-token', processedAt: new Date() }
              );
            }
            
            // Periodic heartbeat update
            run.heartbeatAt = new Date();
            await this.runRepository.save(run);
            continue;
          }

          // Atomic status claim to 'processing' only for valid dispatching recipients
          const dispatchingIds = recipientMappings.map(m => m.recipientId);
          await this.recipientRepository.update(
            { id: In(dispatchingIds) },
            { status: 'processing' }
          );

          try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(messages),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[EXPO PUSH BATCH ERROR BODY]:`, errorText);
              
              // Handle PUSH_TOO_MANY_EXPERIENCE_IDS dynamically
              try {
                const parsedErr = JSON.parse(errorText);
                const firstErr = parsedErr.errors?.[0];
                if (firstErr?.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' && firstErr.details) {
                  console.log('[PUSH] Splitting chunk by experience IDs and retrying...');
                  const experienceGroups = firstErr.details;
                  
                  for (const expId of Object.keys(experienceGroups)) {
                    const groupTokens = experienceGroups[expId];
                    const groupMessages = messages.filter(m => groupTokens.includes(m.to));
                    if (groupMessages.length === 0) continue;
                    
                    console.log(`[PUSH] Retrying experience group ${expId} with ${groupMessages.length} messages`);
                    const groupRes = await fetch('https://exp.host/--/api/v2/push/send', {
                      method: 'POST',
                      headers: {
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(groupMessages),
                    });
                    
                    if (groupRes.ok) {
                      const groupResBody = await groupRes.json();
                      const groupTickets = groupResBody?.data || [];
                      for (let idx = 0; idx < groupMessages.length; idx++) {
                        const msg = groupMessages[idx];
                        const ticket = groupTickets[idx];
                        const matchingRec = chunk.find(r => r.pushToken?.trim() === msg.to);
                        if (matchingRec) {
                          if (ticket && ticket.status === 'ok' && ticket.id) {
                            await this.recipientRepository.update(
                              { id: matchingRec.id },
                              { 
                                status: 'submitted', 
                                expoTicketId: ticket.id, 
                                receiptStatus: 'PENDING',
                                receiptNextCheckAt: new Date(Date.now() + 15 * 60 * 1000),
                                processedAt: new Date() 
                              }
                            );
                          } else {
                            // Differentiate failure classification
                            const isPermanent = ticket?.details?.error && ['DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded', 'InvalidCredentials'].includes(ticket.details.error);
                            await this.recipientRepository.update(
                              { id: matchingRec.id },
                              { 
                                status: 'failed', 
                                failureType: isPermanent ? 'PERMANENT' : 'RETRYABLE',
                                errorMessage: ticket?.message || 'Ticket failed', 
                                processedAt: new Date() 
                              }
                            );
                            if (isPermanent && ticket?.details?.error === 'DeviceNotRegistered' && matchingRec.devicePushTokenId) {
                              console.log(`[PUSH] Deactivating exact token ID ${matchingRec.devicePushTokenId} due to ticket-level DeviceNotRegistered.`);
                              await this.devicePushTokenRepository.update(
                                { id: matchingRec.devicePushTokenId },
                                { isActive: false }
                              );
                            }
                          }
                        }
                      }
                    } else {
                      const groupErrText = await groupRes.text();
                      console.error(`[EXPO PUSH GROUP ERROR]:`, groupErrText);
                      const groupRecs = chunk.filter(r => groupTokens.includes(r.pushToken?.trim()));
                      for (const r of groupRecs) {
                        await this.recipientRepository.update(
                          { id: r.id },
                          { 
                            status: 'failed', 
                            failureType: 'RETRYABLE',
                            errorMessage: `Group retry failed: ${groupErrText}`, 
                            processedAt: new Date() 
                          }
                        );
                      }
                    }
                  }
                  
                  // Periodic heartbeat update
                  run.heartbeatAt = new Date();
                  await this.runRepository.save(run);
                  continue;
                }
              } catch (parseErr) {
                console.error('[PUSH] Failed to parse Expo error body:', parseErr);
              }
              
              throw new Error(`Expo response status ${response.status}: ${errorText}`);
            }

            const resBody = await response.json();
            const tickets = resBody?.data || [];

            // Update recipient status logs in correct ticket order index matching
            for (let idx = 0; idx < recipientMappings.length; idx++) {
              const mapping = recipientMappings[idx];
              const ticket = tickets[idx];
              if (ticket) {
                if (ticket.status === 'ok' && ticket.id) {
                  await this.recipientRepository.update(
                    { id: mapping.recipientId },
                    { 
                      status: 'submitted', 
                      expoTicketId: ticket.id, 
                      receiptStatus: 'PENDING',
                      receiptNextCheckAt: new Date(Date.now() + 15 * 60 * 1000),
                      processedAt: new Date() 
                    }
                  );
                } else {
                  const errMsg = ticket.message || 'Expo submission failed';
                  const isPermanent = ticket.details?.error && ['DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded', 'InvalidCredentials'].includes(ticket.details.error);
                  await this.recipientRepository.update(
                    { id: mapping.recipientId },
                    { 
                      status: 'failed', 
                      failureType: isPermanent ? 'PERMANENT' : 'RETRYABLE',
                      errorMessage: errMsg, 
                      processedAt: new Date() 
                    }
                  );
                  if (isPermanent && ticket.details?.error === 'DeviceNotRegistered') {
                    console.log(`[PUSH] Deactivating exact token ID ${mapping.devicePushTokenId} due to ticket-level DeviceNotRegistered.`);
                    await this.devicePushTokenRepository.update(
                      { id: mapping.devicePushTokenId },
                      { isActive: false }
                    );
                  }
                }
              }
            }

          } catch (chunkErr: any) {
            console.error(`[PUSH BATCH ERROR] Chunk index ${i} failed:`, chunkErr.message || chunkErr);
            // Mark dispatching recipients as 'unknown' due to network timeout or server interruption
            await this.recipientRepository.update(
              { id: In(dispatchingIds), status: 'processing' },
              { status: 'unknown', errorMessage: chunkErr.message || 'Server timeout during dispatch', processedAt: new Date() }
            );
          }
          
          // Periodic heartbeat update after chunk processing
          run.heartbeatAt = new Date();
          await this.runRepository.save(run);
        }

        // 5. Aggregate actual final recipient status values into stats structure
        const targetedCount = await this.recipientRepository.count({ where: { runId: run.id } });
        const submittedCount = await this.recipientRepository.count({ where: { runId: run.id, status: 'submitted' } });
        const failedCount = await this.recipientRepository.count({ where: { runId: run.id, status: 'failed' } });
        const noTokenCount = await this.recipientRepository.count({ where: { runId: run.id, status: 'no-token' } });
        const unknownCount = await this.recipientRepository.count({ where: { runId: run.id, status: 'unknown' } });

        run.targetedCount = targetedCount;
        run.submittedCount = submittedCount;
        run.failedCount = failedCount;
        run.noTokenCount = noTokenCount;
        run.unknownCount = unknownCount;
        run.status = 'Sent';
        run.completedAt = new Date();
        run.heartbeatAt = new Date();
        await this.runRepository.save(run);

        // Update campaign stats / status if it's a one-time campaign
        if (campaign.scheduleType === 'NOW' || campaign.scheduleType === 'LATER') {
          campaign.stats = {
            targetedCount,
            submittedCount,
            failedCount,
            noTokenCount,
            unknownCount,
          };
          campaign.status = 'Sent';
          campaign.sentAt = new Date();
          await this.campaignRepository.save(campaign);
        }

      } catch (err: any) {
        console.error(`[PUSH CAMPAIGN BROADCAST ERROR]`, err.message || err);
        run.status = 'Failed';
        run.errorMessage = err.message || String(err);
        run.completedAt = new Date();
        run.heartbeatAt = new Date();
        await this.runRepository.save(run);

        if (campaign && (campaign.scheduleType === 'NOW' || campaign.scheduleType === 'LATER')) {
          campaign.status = 'Failed';
          campaign.lastError = err.message || String(err);
          await this.campaignRepository.save(campaign);
        }
      }
    })();
  }

  private async checkAndSendScheduledCampaigns() {
    const now = new Date();

    // === Part 1: Generate runs for recurring campaigns ===
    const activeRecurringCampaigns = await this.campaignRepository.find({
      where: {
        scheduleType: 'REPEAT',
        recurrenceStatus: 'Active',
      },
    });

    for (const campaign of activeRecurringCampaigns) {
      if (!campaign.nextRunAt || campaign.nextRunAt.getTime() > now.getTime()) {
        continue;
      }

      const graceWindowMs = 15 * 60 * 1000; // 15 minutes grace
      let checkOccurrence = campaign.nextRunAt;
      
      while (checkOccurrence.getTime() <= now.getTime()) {
        const isStale = checkOccurrence.getTime() < now.getTime() - graceWindowMs;
        const currentOccurrence = checkOccurrence;
        const nextOccurrence = calculateNextOccurrence(campaign, currentOccurrence);
        
        try {
          await this.dataSource.transaction(async (manager) => {
            const lockedCampaign = await manager.createQueryBuilder(PushCampaign, 'campaign')
              .setLock('pessimistic_write')
              .where('campaign.id = :id', { id: campaign.id })
              .getOne();
              
            if (!lockedCampaign || lockedCampaign.recurrenceStatus !== 'Active' || lockedCampaign.nextRunAt?.getTime() !== currentOccurrence.getTime()) {
              return;
            }
            
            if (isStale) {
              console.warn(`[PUSH SCHEDULER] Misfire detected for campaign #${campaign.id} at ${currentOccurrence.toISOString()}. Creating Skipped run.`);
              await manager.save(PushCampaignRun, manager.create(PushCampaignRun, {
                campaignId: campaign.id,
                scheduledFor: currentOccurrence,
                status: 'Skipped',
                triggerType: 'SCHEDULED',
                occurrenceKey: `${campaign.id}_${currentOccurrence.toISOString()}`,
                errorMessage: 'Misfire: occurrence was skipped because the server was offline beyond the 15-minute grace window.',
              }));
            } else {
              console.log(`[PUSH SCHEDULER] Creating scheduled run for campaign #${campaign.id} at ${currentOccurrence.toISOString()}`);
              await manager.save(PushCampaignRun, manager.create(PushCampaignRun, {
                campaignId: campaign.id,
                scheduledFor: currentOccurrence,
                status: 'Scheduled',
                triggerType: 'SCHEDULED',
                occurrenceKey: `${campaign.id}_${currentOccurrence.toISOString()}`,
              }));
              
              lockedCampaign.scheduledOccurrenceCount += 1;
            }
            
            let newRecurrenceStatus = 'Active';
            let nextRunAtVal: Date | null = nextOccurrence;
            
            if (lockedCampaign.endDateType === 'AFTER_N_SENDS' && lockedCampaign.endAfterSendsCount !== null) {
              if (lockedCampaign.scheduledOccurrenceCount >= lockedCampaign.endAfterSendsCount) {
                newRecurrenceStatus = 'Completed';
                nextRunAtVal = null;
                console.log(`[PUSH SCHEDULER] Campaign #${campaign.id} Completed: the configured recurrence occurrence limit has been exhausted.`);
              }
            }
            
            if (lockedCampaign.endDateType === 'ON_DATE' && lockedCampaign.endDate !== null) {
              const nextOccurDateStr = DateTime.fromJSDate(nextOccurrence, { zone: lockedCampaign.timezone }).toFormat('yyyy-MM-dd');
              const endDateStr = DateTime.fromJSDate(lockedCampaign.endDate, { zone: lockedCampaign.timezone }).toFormat('yyyy-MM-dd');
              if (nextOccurDateStr > endDateStr) {
                newRecurrenceStatus = 'Completed';
                nextRunAtVal = null;
                console.log(`[PUSH SCHEDULER] Campaign #${campaign.id} Completed: the configured recurrence occurrence limit has been exhausted.`);
              }
            }
            
            lockedCampaign.recurrenceStatus = newRecurrenceStatus;
            lockedCampaign.nextRunAt = nextRunAtVal;
            await manager.save(PushCampaign, lockedCampaign);
          });
        } catch (txnError: any) {
          console.error(`[PUSH SCHEDULER TRANSACTION ERROR] Campaign #${campaign.id} failed to process occurrence ${currentOccurrence.toISOString()}:`, txnError.message || txnError);
          break;
        }
        
        checkOccurrence = nextOccurrence;
      }
    }

    // === Part 2: Claim and execute due Scheduled runs ===
    const dueRuns = await this.runRepository.createQueryBuilder('run')
      .innerJoinAndSelect('run.campaign', 'campaign')
      .where('run.status = :status', { status: 'Scheduled' })
      .andWhere('run.scheduledFor <= :now', { now })
      .getMany();

    for (const run of dueRuns) {
      try {
        console.log(`[PUSH SCHEDULER] Claiming and triggering due run #${run.id} (Campaign #${run.campaignId} - "${run.campaign.title}")`);
        await this.executeRun(run.id);
      } catch (err: any) {
        console.error(`[PUSH SCHEDULER] Failed to trigger run #${run.id}:`, err.message || err);
      }
    }
  }

  private async resolveAudience(campaign: { targetAudience: string; selectedUserIds?: number[]; selectedCity?: string }): Promise<User[]> {
    const rawUsers = await this.resolveRawAudience(campaign);
    const userIds = rawUsers.map(u => u.id);
    if (userIds.length === 0) return [];

    const deviceTokens = await this.devicePushTokenRepository.find({
      where: { userId: In(userIds), appType: AppType.CUSTOMER, isActive: true },
    });

    const tokenMap = new Map<number, { token: string; id: number }>();
    for (const dt of deviceTokens) {
      tokenMap.set(dt.userId, { token: dt.token, id: dt.id });
    }

    for (const u of rawUsers) {
      const tokenInfo = tokenMap.get(u.id);
      u.pushToken = tokenInfo ? tokenInfo.token : null;
      (u as any).devicePushTokenId = tokenInfo ? tokenInfo.id : null;
    }

    return rawUsers;
  }

  private async resolveRawAudience(campaign: { targetAudience: string; selectedUserIds?: number[]; selectedCity?: string }): Promise<User[]> {
    switch (campaign.targetAudience) {
      case 'ALL_CUSTOMERS':
        return await this.userRepository.find({
          where: { role: UserRole.CUSTOMER },
          select: ['id'],
        });

      case 'SELECTED_CUSTOMERS':
        let rawIds: any[] = [];
        if (typeof campaign.selectedUserIds === 'string') {
          try {
            rawIds = JSON.parse(campaign.selectedUserIds);
          } catch (e) {
            rawIds = [];
          }
        } else if (Array.isArray(campaign.selectedUserIds)) {
          rawIds = campaign.selectedUserIds;
        }

        if (!rawIds || rawIds.length === 0) {
          return [];
        }
        const uniqueIds = Array.from(new Set(rawIds.map(Number)));
        return await this.userRepository.find({
          where: { id: In(uniqueIds), role: UserRole.CUSTOMER },
          select: ['id'],
        });

      case 'ACTIVE_CUSTOMERS': {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return await this.userRepository.createQueryBuilder('user')
          .where('user.role = :role', { role: UserRole.CUSTOMER })
          .andWhere(new Brackets(qb => {
            qb.where('user.createdAt >= :cutoff', { cutoff })
              .orWhere('user.id IN (SELECT DISTINCT o.userId FROM orders o WHERE o.placedAt >= :cutoff)', { cutoff });
          }))
          .select(['user.id'])
          .getMany();
      }

      case 'ORDERED_BEFORE':
        return await this.userRepository.createQueryBuilder('user')
          .where('user.role = :role', { role: UserRole.CUSTOMER })
          .andWhere('user.id IN (SELECT DISTINCT o.userId FROM orders o)')
          .select(['user.id'])
          .getMany();

      case 'NOT_ORDERED_RECENTLY': {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return await this.userRepository.createQueryBuilder('user')
          .where('user.role = :role', { role: UserRole.CUSTOMER })
          .andWhere('user.id IN (SELECT DISTINCT o.userId FROM orders o)')
          .andWhere('user.id NOT IN (SELECT DISTINCT o.userId FROM orders o WHERE o.placedAt >= :cutoff)', { cutoff })
          .select(['user.id'])
          .getMany();
      }

      case 'SELECTED_CITY': {
        const city = campaign.selectedCity?.trim().toLowerCase();
        if (!city) return [];
        return await this.userRepository.createQueryBuilder('user')
          .innerJoin('addresses', 'addr', 'addr.userId = user.id')
          .where('user.role = :role', { role: UserRole.CUSTOMER })
          .andWhere('LOWER(addr.city) = :city', { city })
          .andWhere('addr.isActive = true')
          .select(['user.id'])
          .distinct(true)
          .getMany();
      }

      default:
        return [];
    }
  }

  private async validateTapAction(tapAction: string, tapActionArgument?: string) {
    if (['HOME', 'OFFERS', 'ORDERS'].includes(tapAction)) {
      return;
    }
    if (tapAction === 'RESTAURANT') {
      if (!tapActionArgument) {
        throw new BadRequestException('RESTAURANT action requires a restaurant ID argument');
      }
      // Check if restaurant/hotel exists
      const hotelId = parseInt(tapActionArgument, 10);
      if (isNaN(hotelId)) {
        throw new BadRequestException('Invalid restaurant ID argument');
      }
      const hotelExists = await this.dataSource.query(`SELECT 1 FROM hotels WHERE id = $1`, [hotelId]);
      if (hotelExists.length === 0) {
        throw new BadRequestException(`Restaurant with ID ${hotelId} does not exist`);
      }
    } else if (tapAction === 'CAMPAIGN') {
      if (!tapActionArgument) {
        throw new BadRequestException('CAMPAIGN action requires a campaign ID argument');
      }
      const campaignId = parseInt(tapActionArgument, 10);
      if (isNaN(campaignId)) {
        throw new BadRequestException('Invalid campaign ID argument');
      }
      // Check if store99 campaign exists
      const campExists = await this.dataSource.query(`SELECT 1 FROM store_99_campaigns WHERE id = $1`, [campaignId]);
      if (campExists.length === 0) {
        throw new BadRequestException(`Campaign with ID ${campaignId} does not exist`);
      }
    } else {
      throw new BadRequestException(`Invalid tapAction type: ${tapAction}`);
    }
  }

  async checkPendingReceipts(): Promise<void> {
    const claimId = 'claim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const leaseTimeoutMs = 5 * 60 * 1000; // 5 minutes
    const leaseTimeoutDate = new Date(Date.now() - leaseTimeoutMs);
    const now = new Date();

    const claimedRecipients = await this.dataSource.transaction(async (manager) => {
      const recipients = await manager.getRepository(PushCampaignRecipient)
        .createQueryBuilder('rec')
        .setLock('pessimistic_write')
        .where('rec.receiptStatus = :status', { status: 'PENDING' })
        .andWhere('rec.expoTicketId IS NOT NULL')
        .andWhere('rec.receiptNextCheckAt <= :now', { now })
        .andWhere('(rec.receiptClaimId IS NULL OR rec.receiptClaimedAt < :leaseTimeoutDate)', { leaseTimeoutDate })
        .limit(100)
        .getMany();

      if (recipients.length === 0) {
        return [];
      }

      const ids = recipients.map(r => r.id);
      await manager.getRepository(PushCampaignRecipient).update(
        { id: In(ids) },
        { 
          receiptClaimId: claimId,
          receiptClaimedAt: now
        }
      );
      
      return recipients.map(r => ({ ...r, receiptClaimId: claimId, receiptClaimedAt: now }));
    });

    if (claimedRecipients.length === 0) {
      return;
    }

    const ticketIds = claimedRecipients.map(r => r.expoTicketId).filter((id): id is string => !!id);
    
    let receiptsMap: Record<string, any> = {};
    let requestFailed = false;
    let transportErrorMsg = '';

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      if (response.ok) {
        const body = await response.json();
        receiptsMap = body?.data || {};
      } else {
        requestFailed = true;
        transportErrorMsg = await response.text();
      }
    } catch (err: any) {
      requestFailed = true;
      transportErrorMsg = err.message || String(err);
    }

    if (requestFailed) {
      console.error(`[PUSH RECEIPTS] API fetch error: ${transportErrorMsg}. Rolling back check times with transport backoff.`);
      
      await this.dataSource.transaction(async (manager) => {
        for (const rec of claimedRecipients) {
          const transportCount = rec.receiptTransportRetryCount + 1;
          const backoffMins = transportCount === 1 ? 5 : transportCount === 2 ? 15 : 30;
          await manager.getRepository(PushCampaignRecipient).update(
            { id: rec.id, receiptClaimId: claimId },
            {
              receiptClaimId: null,
              receiptClaimedAt: null,
              receiptTransportRetryCount: transportCount,
              receiptNextCheckAt: new Date(Date.now() + backoffMins * 60 * 1000)
            }
          );
        }
      });
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const recipientRepo = manager.getRepository(PushCampaignRecipient);
      const tokenRepo = manager.getRepository(DevicePushToken);

      for (const rec of claimedRecipients) {
        const freshRec = await recipientRepo.findOne({ where: { id: rec.id } });
        if (!freshRec || freshRec.receiptClaimId !== claimId) {
          continue;
        }

        const receipt = receiptsMap[rec.expoTicketId!];
        
        if (receipt) {
          if (receipt.status === 'ok') {
            await recipientRepo.update(
              { id: rec.id, receiptStatus: 'PENDING' },
              {
                receiptStatus: 'OK',
                receiptCheckedAt: new Date(),
                receiptClaimId: null,
                receiptClaimedAt: null,
                receiptTransportRetryCount: 0
              }
            );
          } else {
            const errCode = receipt.details?.error || 'ReceiptError';
            const errMsg = receipt.message || 'Receipt error response';
            
            await recipientRepo.update(
              { id: rec.id, receiptStatus: 'PENDING' },
              {
                receiptStatus: 'ERROR',
                receiptErrorCode: errCode,
                receiptErrorMessage: errMsg,
                receiptCheckedAt: new Date(),
                receiptClaimId: null,
                receiptClaimedAt: null,
                receiptTransportRetryCount: 0
              }
            );

            if (errCode === 'DeviceNotRegistered' && rec.devicePushTokenId) {
              console.log(`[PUSH] Deactivating exact token ID ${rec.devicePushTokenId} due to receipt-level DeviceNotRegistered.`);
              await tokenRepo.update(
                { id: rec.devicePushTokenId },
                { isActive: false }
              );
            }
          }
        } else {
          const retryCount = rec.receiptRetryCount + 1;
          
          if (retryCount >= 5) {
            await recipientRepo.update(
              { id: rec.id, receiptStatus: 'PENDING' },
              {
                receiptStatus: 'UNAVAILABLE',
                receiptCheckedAt: new Date(),
                receiptClaimId: null,
                receiptClaimedAt: null,
                receiptTransportRetryCount: 0
              }
            );
          } else {
            const backoffMins = retryCount === 1 ? 30 : retryCount === 2 ? 60 : retryCount === 3 ? 240 : 720;
            await recipientRepo.update(
              { id: rec.id, receiptClaimId: claimId },
              {
                receiptClaimId: null,
                receiptClaimedAt: null,
                receiptRetryCount: retryCount,
                receiptNextCheckAt: new Date(Date.now() + backoffMins * 60 * 1000),
                receiptTransportRetryCount: 0
              }
            );
          }
        }
      }
    });
  }

  async getRunDetails(runId: number): Promise<any> {
    const run = await this.runRepository.findOne({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException(`Run #${runId} not found`);
    }
    const recipients = await this.recipientRepository.find({
      where: { runId },
      order: { id: 'ASC' },
    });

    const receiptCounts = await this.recipientRepository.createQueryBuilder('rec')
      .select('rec.receiptStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('rec.runId = :runId', { runId })
      .groupBy('rec.receiptStatus')
      .getRawMany();

    const counts: Record<string, number> = {
      PENDING: 0,
      OK: 0,
      ERROR: 0,
      UNAVAILABLE: 0,
      NULL: 0,
    };
    for (const row of receiptCounts) {
      const statusKey = row.status || 'NULL';
      counts[statusKey] = parseInt(row.count, 10);
    }

    const ticketInvalidCount = await this.recipientRepository.count({
      where: {
        runId,
        failureType: 'PERMANENT',
        errorMessage: Like('%DeviceNotRegistered%'),
      }
    });
    const receiptInvalidCount = await this.recipientRepository.count({
      where: {
        runId,
        receiptStatus: 'ERROR',
        receiptErrorCode: 'DeviceNotRegistered',
      }
    });

    const runDetails = {
      ...run,
      receiptPendingCount: counts.PENDING,
      receiptOkCount: counts.OK,
      receiptErrorCount: counts.ERROR,
      receiptUnavailableCount: counts.UNAVAILABLE,
      invalidTokensCount: ticketInvalidCount + receiptInvalidCount,
    };

    const sanitizedRecipients = recipients.map(r => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      expoTicketId: r.expoTicketId,
      errorMessage: r.errorMessage,
      failureType: r.failureType,
      receiptStatus: r.receiptStatus,
      receiptCheckedAt: r.receiptCheckedAt,
      receiptErrorCode: r.receiptErrorCode,
      receiptErrorMessage: r.receiptErrorMessage,
      processedAt: r.processedAt,
    }));

    return { run: runDetails, recipients: sanitizedRecipients };
  }

  async checkRunReceiptsManually(runId: number): Promise<{ success: boolean; checkedCount: number }> {
    const claimId = 'manual_claim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const now = new Date();

    const claimedRecipients = await this.dataSource.transaction(async (manager) => {
      const recipients = await manager.getRepository(PushCampaignRecipient)
        .createQueryBuilder('rec')
        .setLock('pessimistic_write')
        .where('rec.runId = :runId', { runId })
        .andWhere('rec.receiptStatus = :status', { status: 'PENDING' })
        .andWhere('rec.expoTicketId IS NOT NULL')
        .getMany();

      if (recipients.length === 0) {
        return [];
      }

      const ids = recipients.map(r => r.id);
      await manager.getRepository(PushCampaignRecipient).update(
        { id: In(ids) },
        { 
          receiptClaimId: claimId,
          receiptClaimedAt: now
        }
      );
      
      return recipients.map(r => ({ ...r, receiptClaimId: claimId, receiptClaimedAt: now }));
    });

    if (claimedRecipients.length === 0) {
      return { success: true, checkedCount: 0 };
    }

    const ticketIds = claimedRecipients.map(r => r.expoTicketId).filter((id): id is string => !!id);
    
    let receiptsMap: Record<string, any> = {};
    let requestFailed = false;
    let transportErrorMsg = '';

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      if (response.ok) {
        const body = await response.json();
        receiptsMap = body?.data || {};
      } else {
        requestFailed = true;
        transportErrorMsg = await response.text();
      }
    } catch (err: any) {
      requestFailed = true;
      transportErrorMsg = err.message || String(err);
    }

    if (requestFailed) {
      await this.recipientRepository.update(
        { receiptClaimId: claimId },
        { receiptClaimId: null, receiptClaimedAt: null }
      );
      throw new BadRequestException(`Receipts API transport error: ${transportErrorMsg}`);
    }

    await this.dataSource.transaction(async (manager) => {
      const recipientRepo = manager.getRepository(PushCampaignRecipient);
      const tokenRepo = manager.getRepository(DevicePushToken);

      for (const rec of claimedRecipients) {
        const freshRec = await recipientRepo.findOne({ where: { id: rec.id } });
        if (!freshRec || freshRec.receiptClaimId !== claimId) {
          continue;
        }

        const receipt = receiptsMap[rec.expoTicketId!];
        
        if (receipt) {
          if (receipt.status === 'ok') {
            await recipientRepo.update(
              { id: rec.id, receiptStatus: 'PENDING' },
              {
                receiptStatus: 'OK',
                receiptCheckedAt: new Date(),
                receiptClaimId: null,
                receiptClaimedAt: null,
                receiptTransportRetryCount: 0
              }
            );
          } else {
            const errCode = receipt.details?.error || 'ReceiptError';
            const errMsg = receipt.message || 'Receipt error response';
            
            await recipientRepo.update(
              { id: rec.id, receiptStatus: 'PENDING' },
              {
                receiptStatus: 'ERROR',
                receiptErrorCode: errCode,
                receiptErrorMessage: errMsg,
                receiptCheckedAt: new Date(),
                receiptClaimId: null,
                receiptClaimedAt: null,
                receiptTransportRetryCount: 0
              }
            );

            if (errCode === 'DeviceNotRegistered' && rec.devicePushTokenId) {
              await tokenRepo.update(
                { id: rec.devicePushTokenId },
                { isActive: false }
              );
            }
          }
        } else {
          const isDue = rec.receiptNextCheckAt ? new Date(rec.receiptNextCheckAt).getTime() <= Date.now() : true;
          
          if (isDue) {
            const retryCount = rec.receiptRetryCount + 1;
            if (retryCount >= 5) {
              await recipientRepo.update(
                { id: rec.id, receiptStatus: 'PENDING' },
                {
                  receiptStatus: 'UNAVAILABLE',
                  receiptCheckedAt: new Date(),
                  receiptClaimId: null,
                  receiptClaimedAt: null,
                  receiptTransportRetryCount: 0
                }
              );
            } else {
              const backoffMins = retryCount === 1 ? 30 : retryCount === 2 ? 60 : retryCount === 3 ? 240 : 720;
              await recipientRepo.update(
                { id: rec.id, receiptClaimId: claimId },
                {
                  receiptClaimId: null,
                  receiptClaimedAt: null,
                  receiptRetryCount: retryCount,
                  receiptNextCheckAt: new Date(Date.now() + backoffMins * 60 * 1000),
                  receiptTransportRetryCount: 0
                }
              );
            }
          } else {
            await recipientRepo.update(
              { id: rec.id, receiptClaimId: claimId },
              {
                receiptClaimId: null,
                receiptClaimedAt: null
              }
            );
          }
        }
      }
    });

    return { success: true, checkedCount: claimedRecipients.length };
  }

  private async validateAndNormalizeImage(url: string | null | undefined): Promise<{ imageUrl?: string; notificationImageUrl?: string }> {
    if (!url) return {};
    const trimmed = url.trim();
    if (trimmed === '') return {};

    let relativePath: string | null = null;
    const originalUrl = trimmed;

    // 1. Determine local file path if URL is local/relative
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      relativePath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    } else {
      try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname;
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          host.startsWith('172.')
        ) {
          let pathname = parsed.pathname;
          if (pathname.startsWith('/')) {
            pathname = pathname.slice(1);
          }
          relativePath = pathname;
        }
      } catch (e) {
        throw new BadRequestException('Invalid image URL format');
      }
    }

    // 2. Validate and process image
    if (relativePath) {
      const diskPath = path.join(process.cwd(), relativePath);
      if (!fs.existsSync(diskPath)) {
        throw new BadRequestException(`Campaign image file not found on disk at ${relativePath}`);
      }

      // Check original byte size
      const stats = fs.statSync(diskPath);
      const originalSize = stats.size;

      // Decode image using Jimp
      let image: any;
      try {
        const fileBuffer = fs.readFileSync(diskPath);
        image = await Jimp.fromBuffer(fileBuffer, {
          'image/jpeg': { maxMemoryUsageInMB: 1024 }
        } as any);
      } catch (err) {
        throw new BadRequestException('Failed to decode uploaded image. Ensure it is a valid JPEG/PNG.');
      }

      // Check MIME type
      const mime = image.mime;
      if (mime !== 'image/jpeg' && mime !== 'image/png') {
        throw new BadRequestException('Only JPEG and PNG images are supported for notification rich banners.');
      }

      // Compress and resize once
      const ext = path.extname(diskPath);
      const baseName = path.basename(diskPath, ext);
      const dirName = path.dirname(diskPath);
      const notificationFileName = `${baseName}-notification.jpg`;
      const notificationDiskPath = path.join(dirName, notificationFileName);

      const width = image.width;
      if (width > 1024) {
        const w = 1024;
        const h = Math.round((image.height * 1024) / image.width);
        image.resize({ w, h });
      }
      
      // Save locally as compressed JPEG
      const buffer = await image.getBuffer('image/jpeg', { quality: 80 });
      fs.writeFileSync(notificationDiskPath, buffer);

      // Verify compressed size
      let compressedSize = fs.statSync(notificationDiskPath).size;
      if (compressedSize >= 900 * 1024) {
        const fileBuffer2 = fs.readFileSync(notificationDiskPath);
        const image2 = await Jimp.fromBuffer(fileBuffer2, {
          'image/jpeg': { maxMemoryUsageInMB: 1024 }
        });
        const w = 800;
        const h = Math.round((image2.height * 800) / image2.width);
        image2.resize({ w, h });
        const buffer2 = await image2.getBuffer('image/jpeg', { quality: 60 });
        fs.writeFileSync(notificationDiskPath, buffer2);
        compressedSize = fs.statSync(notificationDiskPath).size;
      }

      console.log(`[PUSH IMAGE] Compression complete. Original: ${originalSize} bytes, Compressed: ${compressedSize} bytes`);

      // 3. Upload to HTTPS storage (Catbox.moe)
      try {
        console.log(`[PUSH IMAGE] Storing normalized image to HTTPS storage (catbox.moe)...`);
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(notificationDiskPath));

        const response = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Catbox storage returned HTTP ${response.status}`);
        }

        const publicUrl = (await response.text()).trim();
        if (!publicUrl.startsWith('https://')) {
          throw new Error(`Invalid response URL from storage: ${publicUrl}`);
        }

        console.log(`[PUSH IMAGE] Uploaded successfully: ${publicUrl}`);
        return {
          imageUrl: originalUrl,
          notificationImageUrl: publicUrl,
        };
      } catch (err) {
        console.error('[PUSH IMAGE] Storage upload failed:', err.message || err);
        throw new BadRequestException(`Failed to upload normalized image to secure HTTPS storage: ${err.message || err}`);
      }
    } else {
      // It is a remote public URL
      console.log(`[PUSH IMAGE] Remote image URL detected: ${originalUrl}`);
      try {
        const response = await fetch(originalUrl, { method: 'GET' });
        if (!response.ok) {
          throw new BadRequestException('Remote image URL is not reachable (returned non-200 status)');
        }
        const buffer = await response.buffer();
        const mime = response.headers.get('content-type');
        if (!mime || !mime.startsWith('image/')) {
          throw new BadRequestException('Remote URL does not point to a valid image');
        }

        const size = buffer.length;
        console.log(`[PUSH IMAGE] Remote image size: ${size} bytes`);

        // If remote image is under 900 KB, use it directly!
        if (size < 900 * 1024) {
          return {
            imageUrl: originalUrl,
            notificationImageUrl: originalUrl,
          };
        }

        // If remote image is >= 900 KB, download and compress it
        console.log(`[PUSH IMAGE] Remote image is oversized (${(size / 1024).toFixed(2)} KB). Compressing...`);
        const remoteTempName = `remote-temp-${Date.now()}`;
        const tempDiskPath = path.join(process.cwd(), 'uploads/campaigns', `${remoteTempName}.jpg`);
        const notificationDiskPath = path.join(process.cwd(), 'uploads/campaigns', `${remoteTempName}-notification.jpg`);

        fs.writeFileSync(tempDiskPath, buffer);

        const fileBuffer3 = fs.readFileSync(tempDiskPath);
        const image = await Jimp.fromBuffer(fileBuffer3, {
          'image/jpeg': { maxMemoryUsageInMB: 1024 }
        } as any);
        if (image.width > 1024) {
          const w = 1024;
          const h = Math.round((image.height * 1024) / image.width);
          image.resize({ w, h });
        }
        const buffer2 = await image.getBuffer('image/jpeg', { quality: 80 });
        fs.writeFileSync(notificationDiskPath, buffer2);

        // Upload to Catbox
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(notificationDiskPath));

        const uploadRes = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
        });

        // Clean up temp files
        if (fs.existsSync(tempDiskPath)) {
          fs.unlinkSync(tempDiskPath);
        }
        if (fs.existsSync(notificationDiskPath)) {
          fs.unlinkSync(notificationDiskPath);
        }

        if (!uploadRes.ok) {
          throw new Error('Failed to upload compressed remote image to secure storage');
        }

        const publicUrl = (await uploadRes.text()).trim();
        return {
          imageUrl: originalUrl,
          notificationImageUrl: publicUrl,
        };
      } catch (err) {
        throw new BadRequestException(`Failed to validate/normalize remote image: ${err.message || err}`);
      }
    }
  }

  private async resolvePushImageUrl(url: string | null | undefined): Promise<string | undefined> {
    if (!url) return undefined;
    let resolved = url.trim();
    if (resolved === '') return undefined;

    let relativePath: string | null = null;

    if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
      relativePath = resolved.startsWith('/') ? resolved.slice(1) : resolved;
      const localIp = getLocalIpAddress();
      const port = process.env.PORT || 5000;
      resolved = `http://${localIp}:${port}/${relativePath}`;
    } else {
      try {
        const parsed = new URL(resolved);
        const host = parsed.hostname;
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          host.startsWith('172.')
        ) {
          const localIp = getLocalIpAddress();
          resolved = resolved.replace(/localhost|127\.0\.0\.1/g, localIp);
          
          let pathname = parsed.pathname;
          if (pathname.startsWith('/')) {
            pathname = pathname.slice(1);
          }
          relativePath = pathname;
        }
      } catch (e) {}
    }

    if (relativePath) {
      const diskPath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(diskPath)) {
        try {
          console.log(`[PUSH IMAGE] Uploading local file to catbox.moe: ${diskPath}`);
          const form = new FormData();
          form.append('reqtype', 'fileupload');
          form.append('fileToUpload', fs.createReadStream(diskPath));

          const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
          });

          if (response.ok) {
            const catboxUrl = await response.text();
            if (catboxUrl && catboxUrl.trim().startsWith('http')) {
              console.log(`[PUSH IMAGE] Uploaded to catbox.moe: ${catboxUrl.trim()}`);
              return catboxUrl.trim();
            }
          }
          console.error(`[PUSH IMAGE] Catbox upload returned status ${response.status}`);
        } catch (err) {
          console.error('[PUSH IMAGE] Failed to upload local image to catbox.moe:', err);
        }
      } else {
        console.warn(`[PUSH IMAGE] Disk file not found at: ${diskPath}`);
      }
    }

    return resolved;
  }
}
