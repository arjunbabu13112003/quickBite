import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, Like, IsNull, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { unlinkSync, existsSync } from 'fs';
import { DeliveryPartner, DeliveryPartnerAccountStatus } from './delivery-partner.entity';
import { DeliveryPartnerDocument, DocumentType, DocumentVerificationStatus } from './delivery-partner-document.entity';
import { DeliveryPartnerBankDetails } from './delivery-partner-bank-details.entity';
import { DeliveryAssignment, DeliveryAssignmentStatus } from './delivery-assignment.entity';
import { DeliveryPartnerOnlineSession } from './delivery-partner-online-session.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { UserRole } from '../users/user-role.enum';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderFinancialAllocation } from '../payments/entities/order-financial-allocation.entity';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { AdminCreateDeliveryPartnerDto } from './dto/admin-create-delivery-partner.dto';
import { UpdateDeliveryPartnerStatusDto } from './dto/update-delivery-partner-status.dto';
import { VehicleType } from './enums/vehicle-type.enum';
import { DeliveryType } from './enums/delivery-type.enum';
import { BankEncryptionService } from './bank-encryption.service';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto';
import { JwtService } from '@nestjs/jwt';
import { DeliveryPartnerLoginDto } from './dto/delivery-partner-login.dto';
import { UpdateActiveDeliveryLocationDto } from './dto/update-active-delivery-location.dto';
import { decryptPin } from '../orders/orders.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class DeliveryPartnersService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectRepository(DeliveryPartner)
    private readonly partnerRepository: Repository<DeliveryPartner>,
    @InjectRepository(DeliveryAssignment)
    private readonly assignmentRepository: Repository<DeliveryAssignment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    private readonly bankEncryptionService: BankEncryptionService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private heartbeatIntervalId: any;

  async onModuleInit() {
    await this.runLegacyStatusBackfill();
    this.startHeartbeatMonitor();
  }

  onModuleDestroy() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }
  }

  private startHeartbeatMonitor() {
    this.heartbeatIntervalId = setInterval(async () => {
      try {
        await this.checkStalePartners();
      } catch (err) {
        console.error('[Heartbeat Monitor Error]:', err);
      }
    }, 15000);
  }

  private async checkStalePartners() {
    const staleTime = new Date(Date.now() - 75000); // 75 seconds ago
    const onlinePartners = await this.partnerRepository.find({
      where: { isOnline: true },
    });

    // Find partners who currently have active assignments to avoid marking them offline during delivery
    const activeAssignments = await this.assignmentRepository.find({
      where: { isActive: true },
    });
    const partnersWithActiveDelivery = new Set(
      activeAssignments.map((a) => a.deliveryPartnerId),
    );

    for (const partner of onlinePartners) {
      // Bypass heartbeat timeout if partner is actively delivering an order
      if (partnersWithActiveDelivery.has(partner.id)) {
        continue;
      }

      const lastHeartbeat = partner.lastHeartbeatAt;
      if (!lastHeartbeat || lastHeartbeat < staleTime) {
        await this.processStalePartner(partner);
      }
    }
  }

  private async processStalePartner(partner: DeliveryPartner) {
    console.log(`[Heartbeat Monitor] Partner ${partner.id} has gone stale. lastHeartbeatAt: ${partner.lastHeartbeatAt}`);

    // 1. Cancel offered assignments and re-dispatch
    const activeOffered = await this.assignmentRepository.find({
      where: {
        deliveryPartnerId: partner.id,
        status: DeliveryAssignmentStatus.OFFERED,
        isActive: true
      }
    });
    for (const assignment of activeOffered) {
      assignment.status = DeliveryAssignmentStatus.CANCELLED;
      assignment.isActive = false;
      assignment.unassignedAt = new Date();
      await this.assignmentRepository.save(assignment);
      this.triggerDispatchForOrder(assignment.orderId).catch(err => {
        console.error(`[Heartbeat Monitor Dispatch Error] Failed to re-dispatch order ${assignment.orderId}:`, err);
      });
    }

    // 2. Close open sessions
    const sessionRepo = this.dataSource.getRepository(DeliveryPartnerOnlineSession);
    const openSessions = await sessionRepo.find({
      where: { deliveryPartnerId: partner.id, endTime: IsNull() }
    });
    const cutoffTime = partner.lastHeartbeatAt || new Date();
    for (const sess of openSessions) {
      sess.endTime = cutoffTime;
      await sessionRepo.save(sess);
    }

    // 3. Mark offline
    partner.isOnline = false;
    partner.isAvailable = false;
    await this.partnerRepository.save(partner);
  }

  async registerHeartbeat(userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found.');
    }

    if (partner.isOnline) {
      partner.lastHeartbeatAt = new Date();
      await this.partnerRepository.save(partner);
    }

    return {
      isOnline: partner.isOnline,
      isAvailable: partner.isAvailable,
      accountStatus: partner.accountStatus || (partner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING),
    };
  }

  private async runLegacyStatusBackfill() {
    try {
      await this.dataSource.transaction(async (manager) => {
        const partnerRepo = manager.getRepository(DeliveryPartner);
        
        // 1. Find verified partners with PENDING/null status, and migrate to APPROVED
        const legacyVerified = await partnerRepo.find({
          where: [
            { isVerified: true, accountStatus: DeliveryPartnerAccountStatus.PENDING },
            { isVerified: true, accountStatus: null as any },
          ]
        });

        if (legacyVerified.length > 0) {
          console.log(`[Backfill] Found ${legacyVerified.length} legacy verified partners with PENDING/null status. Migrating to APPROVED...`);
          for (const partner of legacyVerified) {
            partner.accountStatus = DeliveryPartnerAccountStatus.APPROVED;
            await partnerRepo.save(partner);
            console.log(`[Backfill] Migrated partner ID ${partner.id} to APPROVED.`);
          }
        }

        // 2. Find unverified partners with null status, and default to PENDING
        const legacyUnverified = await partnerRepo.find({
          where: [
            { isVerified: false, accountStatus: null as any }
          ]
        });

        if (legacyUnverified.length > 0) {
          console.log(`[Backfill] Found ${legacyUnverified.length} legacy unverified partners with null status. Setting default to PENDING...`);
          for (const partner of legacyUnverified) {
            partner.accountStatus = DeliveryPartnerAccountStatus.PENDING;
            await partnerRepo.save(partner);
            console.log(`[Backfill] Set partner ID ${partner.id} status to PENDING.`);
          }
        }
      });
    } catch (err) {
      console.error('[Backfill] Failed to run legacy status backfill:', err);
    }
  }

  async login(dto: DeliveryPartnerLoginDto) {
    const trimmed = dto.identifier.trim();
    let user = null;

    if (trimmed.includes('@')) {
      const normalizedEmail = trimmed.toLowerCase();
      user = await this.userRepository.findOne({
        where: { email: normalizedEmail }
      });
    } else {
      const normalizedMobile = trimmed.replace(/^\+91\s*/, '').replace(/^91\s*/, '').replace(/[\s-]/g, '');
      if (/^\d{10}$/.test(normalizedMobile)) {
        user = await this.userRepository.findOne({
          where: { mobileNumber: normalizedMobile }
        });
      }
    }

    if (!user || user.role !== UserRole.DELIVERY_PARTNER) {
      throw new UnauthorizedException('Invalid email/mobile or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email/mobile or password.');
    }

    const partner = await this.partnerRepository.findOne({
      where: { userId: user.id }
    });
    if (!partner) {
      throw new UnauthorizedException('Invalid email/mobile or password.');
    }

    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const canonicalStatus = partner.accountStatus || (partner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);

    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role
      },
      partner: {
        id: partner.id,
        accountStatus: canonicalStatus,
        statusReason: partner.statusReason,
        isVerified: partner.isVerified,
        isOnline: partner.isOnline,
        isAvailable: partner.isAvailable
      }
    };
  }

  async adminCreate(
    dto: AdminCreateDeliveryPartnerDto,
    files: {
      profilePhoto?: Express.Multer.File[];
      drivingLicense?: Express.Multer.File[];
      vehicleRc?: Express.Multer.File[];
      vehicleInsurance?: Express.Multer.File[];
    },
  ): Promise<DeliveryPartner> {
    const filesUploaded: string[] = [];

    // Extract paths for request-scoped cleanup
    if (files) {
      const keys = ['profilePhoto', 'drivingLicense', 'vehicleRc', 'vehicleInsurance'];
      for (const key of keys) {
        const fileArr = files[key];
        if (fileArr && fileArr.length > 0) {
          filesUploaded.push(fileArr[0].path);
        }
      }
    }

    const cleanupUploadedFiles = () => {
      for (const filePath of filesUploaded) {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`Failed to delete file ${filePath}:`, err);
        }
      }
    };

    try {
      // 1. Mobile number normalization and validation
      const rawMobile = dto.mobileNumber.trim().replace(/^\+91\s*/, '').replace(/^91\s*/, '').replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(rawMobile)) {
        throw new BadRequestException('Enter a valid 10-digit mobile number.');
      }

      // 2. Email normalization
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        throw new BadRequestException('Enter a valid email address.');
      }

      // 3. Zone duplicate checks & normalization
      const normPrefZone = dto.preferredZone.replace(/\s+/g, ' ').trim();
      let normSecZone = null;
      if (dto.secondaryZone && dto.secondaryZone.trim()) {
        normSecZone = dto.secondaryZone.replace(/\s+/g, ' ').trim();
        if (normPrefZone.toLowerCase() === normSecZone.toLowerCase()) {
          throw new BadRequestException('Secondary zone must be different from preferred zone.');
        }
      }

      // 4. Vehicle Type conditionals
      if (dto.vehicleType !== VehicleType.BICYCLE) {
        if (!dto.vehicleNumber || !dto.vehicleNumber.trim()) {
          throw new BadRequestException('Enter a valid vehicle registration number.');
        }
        if (!dto.driversLicenseNumber || !dto.driversLicenseNumber.trim()) {
          throw new BadRequestException("Enter a valid driver's license number.");
        }
      }

      const finalVehNum = dto.vehicleType === VehicleType.BICYCLE ? undefined : dto.vehicleNumber.trim().replace(/[\s-]/g, '').toUpperCase();
      const finalLicNum = dto.vehicleType === VehicleType.BICYCLE ? undefined : dto.driversLicenseNumber.trim().replace(/[\s-]/g, '').toUpperCase();

      // 5. File validations
      const profilePhotoFile = files.profilePhoto && files.profilePhoto.length > 0 ? files.profilePhoto[0] : null;
      if (!profilePhotoFile) {
        throw new BadRequestException('Profile Photo is required.');
      }

      const isMotorVehicle = dto.vehicleType !== VehicleType.BICYCLE;

      const dlFile = files.drivingLicense && files.drivingLicense.length > 0 ? files.drivingLicense[0] : null;
      if (isMotorVehicle && !dlFile) {
        throw new BadRequestException("Driver's License document is required for motor vehicles.");
      }

      const rcFile = files.vehicleRc && files.vehicleRc.length > 0 ? files.vehicleRc[0] : null;
      if (isMotorVehicle && !rcFile) {
        throw new BadRequestException('Vehicle RC document is required for motor vehicles.');
      }

      const insuranceFile = files.vehicleInsurance && files.vehicleInsurance.length > 0 ? files.vehicleInsurance[0] : null;
      if (isMotorVehicle && !insuranceFile) {
        throw new BadRequestException('Vehicle Insurance document is required for motor vehicles.');
      }

      // 6. Payout bank validations
      const bankAccountNormalized = dto.bankAccountNumber.replace(/\s/g, '');
      const confirmAccountNormalized = dto.confirmBankAccountNumber.replace(/\s/g, '');

      if (!/^\d{9,18}$/.test(bankAccountNormalized)) {
        throw new BadRequestException('Enter a valid bank account number (9-18 digits).');
      }
      if (bankAccountNormalized !== confirmAccountNormalized) {
        throw new BadRequestException('Bank account numbers do not match.');
      }

      const ifscTrimmed = dto.ifscCode.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscTrimmed)) {
        throw new BadRequestException('Enter a valid IFSC code (e.g. SBIN0001234).');
      }

      let normalizedUpi = null;
      if (dto.upiId && dto.upiId.trim()) {
        normalizedUpi = dto.upiId.trim();
        if (!/^[\w.-]+@[\w.-]+$/.test(normalizedUpi)) {
          throw new BadRequestException('Enter a valid UPI ID (e.g. name@bank).');
        }
      }

      // Encrypt bank account number using GCM
      const bankAccountNumberEncrypted = this.bankEncryptionService.encrypt(bankAccountNormalized);
      const accountLast4 = bankAccountNormalized.slice(-4);

      // Perform database writes inside transaction
      return await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const partnerRepo = manager.getRepository(DeliveryPartner);
        const docRepo = manager.getRepository(DeliveryPartnerDocument);
        const bankRepo = manager.getRepository(DeliveryPartnerBankDetails);

        // Case-insensitive duplicate check for email using ILike
        const existingEmail = await userRepo.findOne({
          where: { email: ILike(normalizedEmail) }
        });
        if (existingEmail) {
          throw new ConflictException('Email is already registered');
        }

        // Legacy-aware duplicate check for mobile number using memory normalization
        const last4 = rawMobile.slice(-4);
        const mobileCandidates = await userRepo.find({
          where: { mobileNumber: Like(`%${last4}`) }
        });
        const hasMobileDuplicate = mobileCandidates.some(u => {
          const norm = u.mobileNumber.replace(/^\+91\s*/, '').replace(/^91\s*/, '').replace(/[\s-]/g, '');
          return norm === rawMobile;
        });
        if (hasMobileDuplicate) {
          throw new ConflictException('Mobile number is already registered');
        }

        // Hash password using 10 rounds bcrypt configuration
        const hashedPassword = await bcrypt.hash(dto.temporaryPassword, 10);

        // Create new Auth User record with DELIVERY_PARTNER role
        const newUser = userRepo.create({
          name: dto.fullName.trim(),
          email: normalizedEmail,
          mobileNumber: rawMobile,
          password: hashedPassword,
          role: UserRole.DELIVERY_PARTNER
        });
        const savedUser = await userRepo.save(newUser);

        // Create Delivery Partner Profile record linking User
        const newPartner = partnerRepo.create({
          userId: savedUser.id,
          phoneNumber: rawMobile,
          vehicleType: dto.vehicleType,
          vehicleNumber: finalVehNum,
          licenseNumber: finalLicNum,
          preferredZone: normPrefZone,
          secondaryZone: normSecZone,
          deliveryType: dto.deliveryType,
          isVerified: false,
          isOnline: false,
          isAvailable: false,
          isActive: true
        });
        const savedPartner = await partnerRepo.save(newPartner);

        // Save Payout configuration
        const bankDetails = bankRepo.create({
          deliveryPartnerId: savedPartner.id,
          accountHolderName: dto.accountHolderName.trim(),
          bankAccountNumberEncrypted,
          accountLast4,
          ifscCode: ifscTrimmed,
          upiId: normalizedUpi,
        });
        await bankRepo.save(bankDetails);

        // Save Documents metadata
        const docsToSave = [
          { file: profilePhotoFile, type: DocumentType.PROFILE_PHOTO },
          { file: dlFile, type: DocumentType.DRIVERS_LICENSE },
          { file: rcFile, type: DocumentType.VEHICLE_RC },
          { file: insuranceFile, type: DocumentType.VEHICLE_INSURANCE },
        ];

        for (const d of docsToSave) {
          if (d.file) {
            const docEntity = docRepo.create({
              deliveryPartnerId: savedPartner.id,
              documentType: d.type,
              storageKey: d.file.filename,
              originalFileName: d.file.originalname,
              mimeType: d.file.mimetype,
              fileSize: d.file.size,
              verificationStatus: DocumentVerificationStatus.PENDING,
            });
            await docRepo.save(docEntity);
          }
        }

        return savedPartner;
      });
    } catch (err) {
      // Failure clean up: delete files written for this request
      cleanupUploadedFiles();
      throw err;
    }
  }

  async createProfile(
    dto: CreateDeliveryPartnerDto,
  ): Promise<DeliveryPartner> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const existing = await this.partnerRepository.findOne({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'Delivery partner profile already exists for this user',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      user.role = UserRole.DELIVERY_PARTNER;
      await manager.save(User, user);

      const profile = manager.create(DeliveryPartner, {
        ...dto,
        isVerified: false,
        isOnline: false,
        isAvailable: false,
        isActive: true,
      });

      return await manager.save(DeliveryPartner, profile);
    });
  }

  async getProfile(userId: number): Promise<any> {
    const profile = await this.partnerRepository.findOne({
      where: { userId, isActive: true },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException(
        'Delivery partner profile not found or is inactive',
      );
    }

    const bankRepo = this.dataSource.getRepository(DeliveryPartnerBankDetails);
    const bankDetails = await bankRepo.findOne({ where: { deliveryPartnerId: profile.id } });

    const docRepo = this.dataSource.getRepository(DeliveryPartnerDocument);
    const documents = await docRepo.find({ where: { deliveryPartnerId: profile.id } });

    const canonicalStatus = profile.accountStatus || (profile.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);
    
    return {
      partner: {
        id: profile.id,
        userId: profile.userId,
        phoneNumber: profile.phoneNumber,
        vehicleType: profile.vehicleType,
        vehicleNumber: profile.vehicleNumber,
        licenseNumber: profile.licenseNumber,
        preferredZone: profile.preferredZone,
        secondaryZone: profile.secondaryZone,
        deliveryType: profile.deliveryType,
        isVerified: profile.isVerified,
        isOnline: profile.isOnline,
        isAvailable: profile.isAvailable,
        isActive: profile.isActive,
        accountStatus: canonicalStatus,
        statusReason: profile.statusReason,
        createdAt: profile.createdAt,
        user: profile.user ? {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          mobileNumber: profile.user.mobileNumber,
          role: profile.user.role
        } : null,
        bank: bankDetails ? {
          accountHolderName: bankDetails.accountHolderName,
          maskedAccountNumber: `•••• •••• ${bankDetails.accountLast4}`,
          ifscCode: bankDetails.ifscCode,
          upiId: bankDetails.upiId || null,
          verificationStatus: profile.isVerified ? 'VERIFIED' : 'PENDING'
        } : null,
        documents: documents.map(d => ({
          id: d.id,
          type: d.documentType,
          status: d.verificationStatus,
          expiryDate: null,
          rejectionReason: d.verificationNote || null,
          previewUrl: `/delivery-partners/me/documents/${d.id}`
        })),
        preferences: {
          deliveryZone: profile.preferredZone || null,
          secondaryZone: profile.secondaryZone || null,
        }
      }
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<any> {
    const profile = await this.partnerRepository.findOne({
      where: { userId, isActive: true },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    const userRepo = this.dataSource.getRepository(User);
    const user = profile.user;

    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    if (dto.email !== undefined) {
      user.email = dto.email;
    }

    await userRepo.save(user);
    return this.getProfile(userId);
  }

  async getDocumentForPartner(userId: number, documentId: number): Promise<DeliveryPartnerDocument> {
    const profile = await this.partnerRepository.findOne({
      where: { userId, isActive: true },
    });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    const docRepo = this.dataSource.getRepository(DeliveryPartnerDocument);
    const document = await docRepo.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.deliveryPartnerId !== profile.id) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  private getISTDayStart(date: Date): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value);
    const day = parseInt(parts.find(p => p.type === 'day')!.value);

    const pad = (n: number) => String(n).padStart(2, '0');
    return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00+05:30`);
  }

  private getISTDayRange(date: Date): { start: Date; end: Date } {
    const start = this.getISTDayStart(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private getISTWeekRange(date: Date): { start: Date; end: Date } {
    const dayStart = this.getISTDayStart(date);
    const localTime = new Date(dayStart.getTime() + 5.5 * 3600 * 1000);
    const dayOfWeek = localTime.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(dayStart.getTime() + diffToMonday * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
    return { start, end };
  }

  private getISTMonthRange(date: Date): { start: Date; end: Date } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value);

    const pad = (n: number) => String(n).padStart(2, '0');
    const start = new Date(`${year}-${pad(month)}-01T00:00:00+05:30`);
    
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const end = new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00+05:30`);
    return { start, end };
  }

  async getDashboardStats(userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found.');
    }

    const now = new Date();
    
    // IST Ranges
    const { start: todayStart, end: todayEnd } = this.getISTDayRange(now);
    const { start: weekStart, end: weekEnd } = this.getISTWeekRange(now);
    const { start: monthStart, end: monthEnd } = this.getISTMonthRange(now);

    // Calculate today's completed deliveries
    const todayDeliveries = await this.assignmentRepository.createQueryBuilder('assignment')
      .innerJoin('assignment.order', 'order')
      .where('assignment.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('assignment.isActive = :isActive', { isActive: false })
      .andWhere('assignment.status = :status', { status: DeliveryAssignmentStatus.ACCEPTED })
      .andWhere('order.orderStatus = :orderStatus', { orderStatus: OrderStatus.DELIVERED })
      .andWhere('order.deliveredAt >= :todayStart AND order.deliveredAt < :todayEnd', { todayStart, todayEnd })
      .getCount();

    // Calculate this week's completed deliveries
    const weeklyDeliveries = await this.assignmentRepository.createQueryBuilder('assignment')
      .innerJoin('assignment.order', 'order')
      .where('assignment.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('assignment.isActive = :isActive', { isActive: false })
      .andWhere('assignment.status = :status', { status: DeliveryAssignmentStatus.ACCEPTED })
      .andWhere('order.orderStatus = :orderStatus', { orderStatus: OrderStatus.DELIVERED })
      .andWhere('order.deliveredAt >= :weekStart AND order.deliveredAt < :weekEnd', { weekStart, weekEnd })
      .getCount();

    // Calculate this month's completed deliveries
    const monthlyDeliveries = await this.assignmentRepository.createQueryBuilder('assignment')
      .innerJoin('assignment.order', 'order')
      .where('assignment.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('assignment.isActive = :isActive', { isActive: false })
      .andWhere('assignment.status = :status', { status: DeliveryAssignmentStatus.ACCEPTED })
      .andWhere('order.orderStatus = :orderStatus', { orderStatus: OrderStatus.DELIVERED })
      .andWhere('order.deliveredAt >= :monthStart AND order.deliveredAt < :monthEnd', { monthStart, monthEnd })
      .getCount();

    // Calculate today's, this week's, and this month's earnings using correct credit ledger entries
    const ledgerRepo = this.dataSource.getRepository('LedgerEntry');

    const todayEntries = await ledgerRepo.createQueryBuilder('le')
      .where('le.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
      .andWhere('le.direction = :direction', { direction: 'credit' })
      .andWhere('le.createdAt >= :todayStart AND le.createdAt < :todayEnd', { todayStart, todayEnd })
      .getMany();
    const todayEarnings = todayEntries.reduce((sum, entry: any) => sum + Number(entry.amount), 0);

    const weeklyEntries = await ledgerRepo.createQueryBuilder('le')
      .where('le.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
      .andWhere('le.direction = :direction', { direction: 'credit' })
      .andWhere('le.createdAt >= :weekStart AND le.createdAt < :weekEnd', { weekStart, weekEnd })
      .getMany();
    const weeklyEarnings = weeklyEntries.reduce((sum, entry: any) => sum + Number(entry.amount), 0);

    const monthlyEntries = await ledgerRepo.createQueryBuilder('le')
      .where('le.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
      .andWhere('le.direction = :direction', { direction: 'credit' })
      .andWhere('le.createdAt >= :monthStart AND le.createdAt < :monthEnd', { monthStart, monthEnd })
      .getMany();
    const monthlyEarnings = monthlyEntries.reduce((sum, entry: any) => sum + Number(entry.amount), 0);

    // Calculate daily earnings trend for current week (Monday to Sunday)
    const weeklyChart = [];
    const daysLabel = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    for (let i = 0; i < 7; i++) {
      const dayStartIst = new Date(weekStart.getTime() + 5.5 * 3600 * 1000);
      dayStartIst.setDate(dayStartIst.getDate() + i);
      const dayStart = new Date(dayStartIst.getTime() - (3600000 * 5.5));
      const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
      
      const dayEntries = await ledgerRepo.createQueryBuilder('le')
        .where('le.deliveryPartnerId = :partnerId', { partnerId: partner.id })
        .andWhere('le.entryType = :entryType', { entryType: 'delivery_partner_payable' })
        .andWhere('le.direction = :direction', { direction: 'credit' })
        .andWhere('le.createdAt >= :dayStart AND le.createdAt < :dayEnd', { dayStart, dayEnd })
        .getMany();
        
      const dayEarnings = dayEntries.reduce((sum, entry: any) => sum + Number(entry.amount), 0);
      
      const currentIstDayOfWeek = new Date(now.getTime() + 5.5 * 3600 * 1000).getUTCDay();
      const chartDayIndex = i;
      const istDayIndex = currentIstDayOfWeek === 0 ? 6 : currentIstDayOfWeek - 1;

      weeklyChart.push({
        day: daysLabel[i],
        value: dayEarnings,
        height: 5,
        selected: chartDayIndex === istDayIndex,
      });
    }

    // Calculate cumulative online seconds today in IST
    const sessionRepo = this.dataSource.getRepository(DeliveryPartnerOnlineSession);
    const sessions = await sessionRepo.createQueryBuilder('session')
      .where('session.deliveryPartnerId = :partnerId', { partnerId: partner.id })
      .andWhere('session.startTime < :todayEnd AND (session.endTime IS NULL OR session.endTime >= :todayStart)', { todayStart, todayEnd })
      .getMany();

    let totalOnlineSeconds = 0;
    const nowTime = new Date();
    for (const session of sessions) {
      const sessionStart = session.startTime.getTime() < todayStart.getTime() ? todayStart : session.startTime;
      const sessionEnd = session.endTime ? (session.endTime.getTime() > todayEnd.getTime() ? todayEnd : session.endTime) : (nowTime.getTime() > todayEnd.getTime() ? todayEnd : nowTime);
      
      if (sessionEnd.getTime() > sessionStart.getTime()) {
        totalOnlineSeconds += Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000);
      }
    }

    const activeSession = sessions.find(s => !s.endTime);
    const activeOnlineSessionStartedAt = activeSession ? activeSession.startTime.toISOString() : null;

    const stats = {
      todayEarnings,
      todayDeliveries,
      weeklyEarnings,
      weeklyDeliveries,
      monthlyEarnings,
      monthlyDeliveries,
      weeklyChart,
      onlineMinutes: Math.round(totalOnlineSeconds / 60),
      onlineSeconds: totalOnlineSeconds,
      isOnline: partner.isOnline,
      activeOnlineSessionStartedAt,
      serverTime: nowTime.toISOString(),
    };
    
    console.log('[Dashboard Stats Dev Log]:', stats);
    return stats;
  }

  async updateStatus(
    userId: number,
    dto: UpdateDeliveryPartnerStatusDto,
  ): Promise<DeliveryPartner> {
    const profile = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    const isOnline =
      dto.isOnline !== undefined ? dto.isOnline : profile.isOnline;
    let isAvailable =
      dto.isAvailable !== undefined ? dto.isAvailable : profile.isAvailable;

    if (isOnline === false) {
      isAvailable = false;
    }

    if (isAvailable === true) {
      if (!profile.isActive || !profile.isVerified || !isOnline) {
        throw new BadRequestException(
          'Delivery partner must be active, verified, and online to be available',
        );
      }
    }

    if (isOnline === false && profile.isOnline === true) {
      const sessionRepo = this.dataSource.getRepository(DeliveryPartnerOnlineSession);
      const openSessions = await sessionRepo.find({
        where: { deliveryPartnerId: profile.id, endTime: IsNull() }
      });
      const nowTime = new Date();
      for (const sess of openSessions) {
        sess.endTime = nowTime;
        await sessionRepo.save(sess);
      }
    }

    profile.isOnline = isOnline;
    profile.isAvailable = isAvailable;

    return await this.partnerRepository.save(profile);
  }

  async updateLocation(
    userId: number,
    latitude: number,
    longitude: number,
  ): Promise<{ success: boolean }> {
    const profile = await this.partnerRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    profile.currentLatitude = latitude;
    profile.currentLongitude = longitude;
    profile.locationUpdatedAt = new Date();
    if (profile.isOnline) {
      profile.lastHeartbeatAt = new Date();
    }
    await this.partnerRepository.save(profile);
    return { success: true };
  }

  async updateActiveDeliveryLocation(
    userId: number,
    dto: UpdateActiveDeliveryLocationDto,
  ): Promise<{ success: boolean }> {
    const profile = await this.partnerRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    if (
      profile.accountStatus !== 'APPROVED' ||
      !profile.isVerified ||
      !profile.isActive
    ) {
      throw new ForbiddenException('Delivery partner is not active or verified');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: {
        deliveryPartnerId: profile.id,
        status: DeliveryAssignmentStatus.ACCEPTED,
        isActive: true,
      },
      relations: ['order'],
    });

    if (!assignment || !assignment.order) {
      throw new ConflictException('No active accepted delivery assignment found');
    }

    const order = assignment.order;
    if (order.deliveryPartnerId !== profile.id) {
      throw new ForbiddenException('Rider is not assigned to this order');
    }

    if (
      order.orderStatus === OrderStatus.DELIVERED ||
      order.orderStatus === OrderStatus.CANCELLED ||
      order.orderStatus === OrderStatus.REJECTED
    ) {
      throw new ConflictException('Order is already delivered, cancelled, or rejected');
    }

    profile.currentLatitude = dto.latitude;
    profile.currentLongitude = dto.longitude;
    profile.locationAccuracy = dto.accuracy !== undefined ? dto.accuracy : null;
    profile.locationHeading = dto.heading !== undefined ? dto.heading : null;
    profile.locationSpeed = dto.speed !== undefined ? dto.speed : null;
    profile.locationUpdatedAt = new Date();
    profile.lastHeartbeatAt = new Date();

    await this.partnerRepository.save(profile);
    return { success: true };
  }

  async verifyPartner(
    partnerId: number,
    isVerified: boolean,
  ): Promise<DeliveryPartner> {
    const profile = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!profile) {
      throw new NotFoundException(
        `Delivery partner profile with ID ${partnerId} not found`,
      );
    }

    profile.isVerified = isVerified;
    if (isVerified === false) {
      profile.isAvailable = false;
    }

    return await this.partnerRepository.save(profile);
  }

  async assignOrder(
    orderId: number,
    partnerId: number,
  ): Promise<DeliveryAssignment> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.orderStatus !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        `Order is in status "${order.orderStatus}". Can only assign when ready_for_pickup.`,
      );
    }

    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!partner || !partner.isActive) {
      throw new BadRequestException('Delivery partner is inactive or not found');
    }

    if (
      !partner.isVerified ||
      !partner.isOnline ||
      !partner.isAvailable ||
      partner.accountStatus !== DeliveryPartnerAccountStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Delivery partner is not eligible for assignment (must be approved, verified, active, online, and available)',
      );
    }

    // Verify order has no active assignment
    const existingOrderAssignment = await this.assignmentRepository.findOne({
      where: { orderId, isActive: true },
    });
    if (existingOrderAssignment) {
      throw new ConflictException('Order already has an active assignment');
    }

    // Verify partner has no other active assignment
    const existingPartnerAssignment = await this.assignmentRepository.findOne({
      where: { deliveryPartnerId: partnerId, isActive: true },
    });
    if (existingPartnerAssignment) {
      throw new ConflictException(
        'Delivery partner already has an active delivery assignment',
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      // Re-verify and lock inside transaction to protect concurrency
      const lockedPartner = await manager.findOne(DeliveryPartner, {
        where: { id: partnerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !lockedPartner ||
        lockedPartner.accountStatus !== DeliveryPartnerAccountStatus.APPROVED ||
        !lockedPartner.isVerified ||
        !lockedPartner.isActive ||
        !lockedPartner.isOnline ||
        !lockedPartner.isAvailable
      ) {
        throw new BadRequestException(
          'Delivery partner is not eligible or available for assignment.',
        );
      }

      const lockedOrder = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      if (lockedOrder.deliveryPartnerId) {
        throw new ConflictException('Order already has an assigned rider.');
      }

      // Check active assignment for this order
      const existingAssignment = await manager.findOne(DeliveryAssignment, {
        where: { orderId, isActive: true },
      });
      if (existingAssignment) {
        throw new ConflictException('Order already has an active assignment');
      }

      // Check active assignment for this partner
      const existingPartnerAssignment = await manager.findOne(DeliveryAssignment, {
        where: { deliveryPartnerId: partnerId, isActive: true },
      });
      if (existingPartnerAssignment) {
        throw new ConflictException('Delivery partner already has an active assignment');
      }

      const offeredAt = new Date();
      const expiresAt = new Date(offeredAt.getTime() + 300 * 1000); // 5 minutes (300 seconds)

      const assignment = manager.create(DeliveryAssignment, {
        orderId,
        deliveryPartnerId: partnerId,
        isActive: true,
        status: DeliveryAssignmentStatus.OFFERED,
        offeredAt,
        expiresAt,
        assignedAt: offeredAt,
      });

      return await manager.save(DeliveryAssignment, assignment);
    });

    const orderRecord = await this.orderRepository.findOne({ where: { id: orderId } });
    const orderNo = orderRecord ? (orderRecord.orderNumber || orderRecord.id) : orderId;
    await this.notificationsService.createPartnerNotification(
      partnerId,
      'New Delivery Assignment Offered',
      `You have been offered a new delivery request (Order #${orderNo}). You have 23 seconds to accept or decline it.`,
      'assignment_offered',
      orderId,
      saved.id
    ).catch(err => console.error('[Notification Offer Error]:', err));

    return saved;
  }

  async getAssignedOrders(userId: number): Promise<any[]> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    const assignments = await this.assignmentRepository.find({
      where: { deliveryPartnerId: partner.id, isActive: true },
      relations: ['order', 'order.hotel'],
      order: { assignedAt: 'DESC' },
    });

    return assignments.map((a) => {
      const order = a.order;
      const hotel = order?.hotel;
      const hotelPublic = hotel
        ? {
            id: hotel.id,
            name: hotel.name,
            address: hotel.address,
            area: hotel.area,
            city: hotel.city,
            phoneNumber: hotel.phoneNumber,
          }
        : null;

      return {
        assignmentId: a.id,
        assignedAt: a.assignedAt,
        order: order
          ? {
              id: order.id,
              orderNumber: order.orderNumber,
              orderStatus: order.orderStatus,
              totalAmount: parseFloat(order.totalAmount.toString()),
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
            }
          : null,
        hotel: hotelPublic,
        deliveryAddress: order
          ? {
              recipientName: order.deliveryRecipientName,
              phoneNumber: order.deliveryPhoneNumber,
              addressLine1: order.deliveryAddressLine1,
              addressLine2: order.deliveryAddressLine2,
              landmark: order.deliveryLandmark,
              area: order.deliveryArea,
              city: order.deliveryCity,
              state: order.deliveryState,
              pincode: order.deliveryPincode,
              latitude: order.deliveryLatitude
                ? parseFloat(order.deliveryLatitude.toString())
                : null,
              longitude: order.deliveryLongitude
                ? parseFloat(order.deliveryLongitude.toString())
                : null,
            }
          : null,
      };
    });
  }

  async getAssignedOrderDetails(userId: number, orderId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { orderId, deliveryPartnerId: partner.id, isActive: true },
      relations: ['order', 'order.hotel', 'order.items'],
    });

    if (!assignment || !assignment.order) {
      throw new NotFoundException(
        `Assigned order with ID ${orderId} not found for current delivery partner`,
      );
    }

    const order = assignment.order;
    const hotel = order.hotel;
    const hotelPublic = hotel
      ? {
          id: hotel.id,
          name: hotel.name,
          address: hotel.address,
          area: hotel.area,
          city: hotel.city,
          phoneNumber: hotel.phoneNumber,
        }
      : null;

    const items = (order.items || []).map((item) => ({
      id: item.id,
      foodName: item.foodName,
      quantity: item.quantity,
      finalUnitPrice: parseFloat(item.finalUnitPrice.toString()),
      lineTotal: parseFloat(item.lineTotal.toString()),
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerNote: order.customerNote,
      totalAmount: parseFloat(order.totalAmount.toString()),
      placedAt: order.placedAt,
      hasDeliveryPin: !!order.deliveryPinHash,
      deliveryPinVerified: !!order.deliveryPinVerifiedAt,
      deliveryAddress: {
        recipientName: order.deliveryRecipientName,
        phoneNumber: order.deliveryPhoneNumber,
        addressLine1: order.deliveryAddressLine1,
        addressLine2: order.deliveryAddressLine2,
        landmark: order.deliveryLandmark,
        area: order.deliveryArea,
        city: order.deliveryCity,
        state: order.deliveryState,
        pincode: order.deliveryPincode,
        latitude: order.deliveryLatitude
          ? parseFloat(order.deliveryLatitude.toString())
          : null,
        longitude: order.deliveryLongitude
          ? parseFloat(order.deliveryLongitude.toString())
          : null,
      },
      hotel: hotelPublic,
      items,
    };
  }

  async listPartners(
    online?: boolean,
    available?: boolean,
    verified?: boolean,
    active?: boolean,
    status?: string,
  ): Promise<any[]> {
    const whereClause: any = {};
    if (online !== undefined) whereClause.isOnline = online;
    if (available !== undefined) whereClause.isAvailable = available;
    if (verified !== undefined) whereClause.isVerified = verified;
    if (active !== undefined) whereClause.isActive = active;
    if (status !== undefined) whereClause.accountStatus = status;

    const partners = await this.partnerRepository.find({
      where: whereClause,
      relations: ['user'],
    });

    return partners.map((p) => {
      const canonicalStatus = p.accountStatus || (p.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);
      return {
        id: p.id,
        userId: p.userId,
        phoneNumber: p.phoneNumber,
        vehicleType: p.vehicleType,
        vehicleNumber: p.vehicleNumber,
        licenseNumber: p.licenseNumber,
        isVerified: p.isVerified,
        isOnline: p.isOnline,
        isAvailable: p.isAvailable,
        isActive: p.isActive,
        accountStatus: canonicalStatus,
        statusReason: p.statusReason,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        user: p.user
          ? {
              id: p.user.id,
              name: p.user.name,
              email: p.user.email,
              role: p.user.role,
            }
          : null,
      };
    });
  }

  async getActiveAssignment(orderId: number): Promise<DeliveryAssignment | null> {
    return await this.assignmentRepository.findOne({
      where: { orderId, isActive: true },
      relations: ['deliveryPartner', 'deliveryPartner.user'],
    });
  }

  // --- DELIVERY PARTNER STEP 2 LIFECYCLE CONTROLS ---

  async updateDeliveryOrderStatus(
    userId: number,
    orderId: number,
    nextStatus: string,
    deliveryPin?: string,
  ): Promise<any> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (!partner || !partner.isActive || !partner.isVerified) {
      throw new NotFoundException(
        'Delivery partner profile not found, inactive, or unverified',
      );
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { orderId, deliveryPartnerId: partner.id, isActive: true },
      relations: ['order'],
    });
    if (!assignment || !assignment.order) {
      throw new NotFoundException(
        'Active assignment for this order not found for the logged-in partner',
      );
    }

    const order = assignment.order;
    const current = order.orderStatus;
    let isValidTransition = false;

    if (current === OrderStatus.READY_FOR_PICKUP) {
      if (nextStatus === 'picked_up' || nextStatus === 'out_for_delivery') {
        isValidTransition = true;
      }
    } else if (current === 'picked_up') {
      if (nextStatus === 'out_for_delivery') {
        isValidTransition = true;
      }
    } else if (current === 'out_for_delivery') {
      if (nextStatus === 'delivered') {
        isValidTransition = true;
      }
    }

    if (!isValidTransition) {
      throw new BadRequestException(
        `Invalid order status transition from ${current} to ${nextStatus}`,
      );
    }

    const now = new Date();

    if (nextStatus === 'picked_up') {
      order.orderStatus = nextStatus as OrderStatus;
      order.pickedUpAt = now;
      await this.orderRepository.save(order);

      await this.notificationsService.createPartnerNotification(
        partner.id,
        'Order Picked Up',
        `You have picked up Order #${order.orderNumber || order.id}. Proceed to deliver to customer.`,
        'order_picked_up',
        order.id,
        assignment.id
      ).catch(err => console.error('[Notification PickedUp Error]:', err));

      return {
        message: `Order status updated to ${nextStatus}`,
        orderId: order.id,
        orderStatus: order.orderStatus,
      };
    }

    if (nextStatus === 'out_for_delivery') {
      order.orderStatus = nextStatus as OrderStatus;
      order.outForDeliveryAt = now;
      await this.orderRepository.save(order);

      await this.notificationsService.createPartnerNotification(
        partner.id,
        'Out for Delivery',
        `You are now out for delivery for Order #${order.orderNumber || order.id}.`,
        'order_out_for_delivery',
        order.id,
        assignment.id
      ).catch(err => console.error('[Notification OutForDelivery Error]:', err));

      return {
        message: `Order status updated to ${nextStatus}`,
        orderId: order.id,
        orderStatus: order.orderStatus,
      };
    }

    if (nextStatus === 'delivered') {
      if (order.paymentMethod?.toLowerCase() === 'cod') {
        if (!order.cashCollectedAt) {
          throw new ConflictException('Confirm cash collection before completing this delivery.');
        }
      }

      if (order.deliveryPinHash && !order.deliveryPinVerifiedAt) {
        throw new ConflictException('Delivery PIN verification required');
      }

      // Step 1: Commit the delivery state change atomically.
      // The finalization hook is called AFTER this transaction commits so that
      // checkAndFinalizeOrderAllocation sees the fresh orderStatus=delivered row.
      await this.dataSource.transaction(async (manager) => {
        order.orderStatus = OrderStatus.DELIVERED;
        order.deliveredAt = now;

        assignment.isActive = false;
        assignment.unassignedAt = now;

        const freshPartner = await manager.findOne(DeliveryPartner, {
          where: { id: partner.id },
        });

        if (
          freshPartner &&
          freshPartner.isActive &&
          freshPartner.isVerified
        ) {
          freshPartner.isOnline = true;
          freshPartner.isAvailable = true;
        }

        await manager.save(Order, order);
        await manager.save(DeliveryAssignment, assignment);
        if (freshPartner) {
          await manager.save(DeliveryPartner, freshPartner);
        }
      });

      // Step 2: After the delivery transaction commits, trigger the financial
      // finalization check. This opens its own transaction inside PaymentsService.
      await this.paymentsService.checkAndFinalizeOrderAllocation(order.id);

      // Step 3: Fetch the allocation to retrieve the actual delivery partner earning
      const allocation = await this.dataSource.getRepository(OrderFinancialAllocation).findOne({
        where: { orderId: order.id },
      });
      const partnerEarning = allocation ? parseFloat(allocation.deliveryPartnerEarning.toString()) : 0;

      // Fetch fresh partner state
      const freshPartner = await this.partnerRepository.findOne({
        where: { id: partner.id },
      });

      await this.notificationsService.createPartnerNotification(
        partner.id,
        'Delivery Completed!',
        `Successfully delivered Order #${order.orderNumber || order.id}. Great job!`,
        'order_delivered',
        order.id,
        assignment.id
      ).catch(err => console.error('[Notification Delivered Error]:', err));

      if (partnerEarning > 0) {
        await this.notificationsService.createPartnerNotification(
          partner.id,
          'Earnings Credited',
          `You have been credited ₹${partnerEarning.toFixed(2)} for Order #${order.orderNumber || order.id}.`,
          'earnings_credited',
          order.id,
          assignment.id
        ).catch(err => console.error('[Notification Earning Error]:', err));
      }

      // Calculate distances
      const hotelLat = order.hotel?.latitude ? Number(order.hotel.latitude) : null;
      const hotelLng = order.hotel?.longitude ? Number(order.hotel.longitude) : null;
      const destLat = order.deliveryLatitude ? Number(order.deliveryLatitude) : null;
      const destLng = order.deliveryLongitude ? Number(order.deliveryLongitude) : null;
      const partnerLat = partner.currentLatitude ? Number(partner.currentLatitude) : null;
      const partnerLng = partner.currentLongitude ? Number(partner.currentLongitude) : null;

      const riderToRestaurant = (partnerLat && partnerLng && hotelLat && hotelLng)
        ? this.calculateDistance(partnerLat, partnerLng, hotelLat, hotelLng)
        : 0;
      const restaurantToCustomer = (hotelLat && hotelLng && destLat && destLng)
        ? this.calculateDistance(hotelLat, hotelLng, destLat, destLng)
        : 0;
      const totalDistance = Math.round((riderToRestaurant + restaurantToCustomer) * 10) / 10;

      // Calculate duration
      const durationMs = now.getTime() - new Date(assignment.assignedAt).getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

      return {
        success: true,
        message: 'Order status updated to delivered successfully',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: parseFloat(order.totalAmount.toString()),
          restaurantName: order.hotel?.name || 'QuickBite Kitchen',
          customerName: order.deliveryRecipientName,
          deliveredAt: order.deliveredAt,
          acceptedAt: assignment.assignedAt,
          pickedUpAt: order.pickedUpAt,
          outForDeliveryAt: order.outForDeliveryAt,
        },
        financials: {
          finalizedPartnerEarning: partnerEarning,
          earningComponents: {
            deliveryFee: Number(order.deliveryFee),
            bonus: 0
          },
          totalEarned: partnerEarning
        },
        delivery: {
          totalDistance: totalDistance > 0 ? totalDistance : null,
          durationMinutes
        },
        assignmentClosed: true,
        rider: {
          isOnline: freshPartner ? freshPartner.isOnline : false,
          isAvailable: freshPartner ? freshPartner.isAvailable : false,
        }
      };
    }
  }

  async getDeliveryHistory(userId: number): Promise<any[]> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (!partner) {
      throw new NotFoundException('Delivery partner profile not found');
    }

    const assignments = await this.assignmentRepository.find({
      where: { deliveryPartnerId: partner.id, isActive: false },
      relations: ['order', 'order.hotel'],
      order: { unassignedAt: 'DESC' },
    });

    const orderIds = assignments.map((a) => a.orderId).filter(Boolean);
    const allocations = orderIds.length > 0
      ? await this.dataSource.getRepository(OrderFinancialAllocation).find({
          where: { orderId: In(orderIds) },
        })
      : [];
    const allocationMap = new Map(
      allocations.map((al) => [al.orderId, parseFloat(al.deliveryPartnerEarning.toString())]),
    );

    const history = assignments
      .filter((a) => a.order && a.order.orderStatus === OrderStatus.DELIVERED)
      .map((a) => {
        const order = a.order;
        const hotel = order.hotel;
        const partnerEarning = allocationMap.get(order.id) || 0;
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          hotel: hotel
            ? {
                id: hotel.id,
                name: hotel.name,
                address: hotel.address,
                city: hotel.city,
              }
            : null,
          deliveryAddress: {
            recipientName: order.deliveryRecipientName,
            phoneNumber: order.deliveryPhoneNumber,
            addressLine1: order.deliveryAddressLine1,
            addressLine2: order.deliveryAddressLine2,
            landmark: order.deliveryLandmark,
            area: order.deliveryArea,
            city: order.deliveryCity,
            state: order.deliveryState,
            pincode: order.deliveryPincode,
            latitude: order.deliveryLatitude
              ? parseFloat(order.deliveryLatitude.toString())
              : null,
            longitude: order.deliveryLongitude
              ? parseFloat(order.deliveryLongitude.toString())
              : null,
          },
          totalAmount: parseFloat(order.totalAmount.toString()),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          assignedAt: a.assignedAt,
          deliveredAt: order.deliveredAt,
          partnerEarning: partnerEarning,
          earning: partnerEarning,
        };
      });

    return history.sort(
      (a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime(),
    );
  }

  async getAvailableOrders(userId: number): Promise<any[]> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });
    if (
      !partner ||
      partner.accountStatus !== DeliveryPartnerAccountStatus.APPROVED ||
      !partner.isVerified ||
      !partner.isActive ||
      !partner.isOnline ||
      !partner.isAvailable
    ) {
      return [];
    }

    const orderRepo = this.dataSource.getRepository(Order);
    const orders = await orderRepo.find({
      where: { orderStatus: OrderStatus.READY_FOR_PICKUP, deliveryPartnerId: IsNull() },
      relations: ['hotel', 'items'],
    });

    const activeAssignments = await this.dataSource.getRepository(DeliveryAssignment).find({
      where: { isActive: true },
    });

    const now = new Date();
    const excludedOrderIds = activeAssignments
      .filter((a) => a.status === 'ACCEPTED' || (a.status === 'OFFERED' && new Date(a.expiresAt) > now))
      .map((a) => a.orderId);

    const declinedAssignments = await this.dataSource.getRepository(DeliveryAssignment).find({
      where: { deliveryPartnerId: partner.id, status: DeliveryAssignmentStatus.DECLINED },
    });
    const declinedOrderIds = declinedAssignments.map((a) => a.orderId);

    const availableOrders = orders.filter((order) => {
      if (excludedOrderIds.includes(order.id)) return false;
      if (declinedOrderIds.includes(order.id)) return false;

      const hotelArea = order.hotel?.area?.trim().toLowerCase();
      const deliveryArea = order.deliveryArea?.trim().toLowerCase();
      const pref = partner.preferredZone?.trim().toLowerCase();
      const sec = partner.secondaryZone?.trim().toLowerCase();

      const zoneMatch =
        (pref && (pref === hotelArea || pref === deliveryArea)) ||
        (sec && (sec === hotelArea || sec === deliveryArea));
      return !!zoneMatch;
    });

    return availableOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      restaurantName: order.hotel?.name || 'QuickBite Kitchen',
      pickupAddress: order.hotel?.address || 'Restaurant Address',
      deliveryAddress: order.deliveryAddressLine1 || 'Drop Address',
      paymentMethod: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      amount: parseFloat(order.totalAmount.toString()),
      itemCount: order.items?.length || 0,
    }));
  }

  async claimAvailableOrder(userId: number, orderId: number): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      const partner = await manager.findOne(DeliveryPartner, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!partner) {
        throw new NotFoundException('Delivery partner profile not found.');
      }

      if (
        partner.accountStatus !== DeliveryPartnerAccountStatus.APPROVED ||
        !partner.isVerified ||
        !partner.isActive ||
        !partner.isOnline ||
        !partner.isAvailable
      ) {
        throw new BadRequestException('You are not eligible to claim this order.');
      }

      const activePartnerAssignment = await manager.findOne(DeliveryAssignment, {
        where: { deliveryPartnerId: partner.id, isActive: true },
      });
      if (activePartnerAssignment) {
        throw new ConflictException('You already have an active delivery assignment.');
      }

      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Order not found.');
      }

      if (order.deliveryPartnerId) {
        throw new ConflictException('Order has already been assigned to another rider.');
      }

      if (order.orderStatus !== OrderStatus.READY_FOR_PICKUP) {
        throw new BadRequestException('Order is no longer ready for pickup.');
      }

      const acceptedAssignment = await manager.findOne(DeliveryAssignment, {
        where: { orderId: order.id, status: DeliveryAssignmentStatus.ACCEPTED, isActive: true },
      });
      if (acceptedAssignment) {
        throw new ConflictException('Order has already been accepted by another rider.');
      }

      // Deactivate any old OFFERED active assignments for this order
      const pendingOffers = await manager.find(DeliveryAssignment, {
        where: { orderId: order.id, status: DeliveryAssignmentStatus.OFFERED, isActive: true },
      });
      for (const offer of pendingOffers) {
        offer.isActive = false;
        offer.status = DeliveryAssignmentStatus.CANCELLED;
        offer.unassignedAt = new Date();
        await manager.save(DeliveryAssignment, offer);
      }

      const now = new Date();
      const newAssignment = manager.create(DeliveryAssignment, {
        orderId: order.id,
        deliveryPartnerId: partner.id,
        status: DeliveryAssignmentStatus.ACCEPTED,
        isActive: true,
        assignedAt: now,
        acceptedAt: now,
      });
      await manager.save(DeliveryAssignment, newAssignment);

      order.deliveryPartnerId = partner.id;
      order.orderStatus = OrderStatus.ACCEPTED;
      await manager.save(Order, order);

      partner.isAvailable = false;
      await manager.save(DeliveryPartner, partner);

      return {
        success: true,
        assignment: newAssignment,
      };
    });
  }

  async getPartnerDetailsForAdmin(id: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!partner) {
      throw new NotFoundException(`Delivery partner with ID ${id} not found.`);
    }

    const bankRepo = this.dataSource.getRepository(DeliveryPartnerBankDetails);
    const bankDetails = await bankRepo.findOne({ where: { deliveryPartnerId: id } });

    const docRepo = this.dataSource.getRepository(DeliveryPartnerDocument);
    const documents = await docRepo.find({ where: { deliveryPartnerId: id } });

    // Get current active assignment (if any)
    const activeAssignment = await this.assignmentRepository.findOne({
      where: { deliveryPartnerId: id, isActive: true },
      relations: ['order', 'order.hotel'],
    });

    // Get recent 5 completed assignments
    const completedAssignments = await this.assignmentRepository.find({
      where: { deliveryPartnerId: id, isActive: false },
      relations: ['order', 'order.hotel'],
      order: { unassignedAt: 'DESC' },
      take: 5,
    });

    const canonicalStatus = partner.accountStatus || (partner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);

    return {
      partner: {
        id: partner.id,
        userId: partner.userId,
        phoneNumber: partner.phoneNumber,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        licenseNumber: partner.licenseNumber,
        preferredZone: partner.preferredZone,
        secondaryZone: partner.secondaryZone,
        deliveryType: partner.deliveryType,
        isVerified: partner.isVerified,
        isOnline: partner.isOnline,
        isAvailable: partner.isAvailable,
        isActive: partner.isActive,
        accountStatus: canonicalStatus,
        statusReason: partner.statusReason,
        createdAt: partner.createdAt,
        user: partner.user
          ? {
              id: partner.user.id,
              name: partner.user.name,
              email: partner.user.email,
              role: partner.user.role,
            }
          : null,
      },
      payout: bankDetails
        ? {
            accountHolderName: bankDetails.accountHolderName,
            accountLast4: bankDetails.accountLast4,
            maskedAccountNumber: `XXXXXXXX${bankDetails.accountLast4}`,
            ifscCode: bankDetails.ifscCode,
            upiId: bankDetails.upiId,
          }
        : null,
      documents: documents.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        originalFileName: d.originalFileName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        verificationStatus: d.verificationStatus,
        verificationNote: d.verificationNote,
        createdAt: d.createdAt,
      })),
      currentAssignment: activeAssignment
        ? {
            id: activeAssignment.id,
            orderId: activeAssignment.orderId,
            orderNumber: activeAssignment.order?.orderNumber,
            orderStatus: activeAssignment.order?.orderStatus,
            hotelName: activeAssignment.order?.hotel?.name,
            deliveryArea: activeAssignment.order?.deliveryArea,
            assignedAt: activeAssignment.assignedAt,
          }
        : null,
      history: completedAssignments
        .filter((a) => a.order)
        .map((a) => ({
          id: a.id,
          orderId: a.orderId,
          orderNumber: a.order.orderNumber,
          hotelName: a.order.hotel?.name,
          deliveryArea: a.order.deliveryArea,
          totalAmount: parseFloat(a.order.totalAmount.toString()),
          paymentMethod: a.order.paymentMethod,
          paymentStatus: a.order.paymentStatus,
          orderStatus: a.order.orderStatus,
          deliveredAt: a.order.deliveredAt || a.unassignedAt,
        })),
    };
  }

  async getDocumentForAdmin(partnerId: number, documentId: number): Promise<DeliveryPartnerDocument> {
    const docRepo = this.dataSource.getRepository(DeliveryPartnerDocument);
    const document = await docRepo.findOne({
      where: { id: documentId, deliveryPartnerId: partnerId }
    });

    if (!document) {
      throw new NotFoundException('Document not found for this delivery partner.');
    }

    return document;
  }

  async verifyDocument(
    partnerId: number,
    documentId: number,
    dto: VerifyDocumentDto,
  ): Promise<DeliveryPartnerDocument> {
    const docRepo = this.dataSource.getRepository(DeliveryPartnerDocument);
    const document = await docRepo.findOne({
      where: { id: documentId, deliveryPartnerId: partnerId },
    });

    if (!document) {
      throw new NotFoundException('Document not found for this delivery partner.');
    }

    if (dto.status === DocumentVerificationStatus.REJECTED && (!dto.reason || !dto.reason.trim())) {
      throw new BadRequestException('A reason is required when rejecting a document.');
    }

    document.verificationStatus = dto.status;
    if (dto.status === DocumentVerificationStatus.REJECTED) {
      document.verificationNote = dto.reason.trim();
    } else {
      document.verificationNote = null; // Clear rejection reason
    }

    return await docRepo.save(document);
  }

  async updatePartnerAccountStatus(
    id: number,
    dto: UpdatePartnerStatusDto,
  ): Promise<DeliveryPartner> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!partner) {
      throw new NotFoundException(`Delivery partner with ID ${id} not found.`);
    }

    const currentStatus = partner.accountStatus || (partner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);

    if (currentStatus === DeliveryPartnerAccountStatus.APPROVED && dto.status === DeliveryPartnerAccountStatus.PENDING) {
      throw new BadRequestException('Cannot revert approved account back to pending.');
    }

    if (dto.status === DeliveryPartnerAccountStatus.APPROVED) {
      const docRepo = this.dataSource.getRepository(DeliveryPartnerDocument);
      const docs = await docRepo.find({ where: { deliveryPartnerId: id } });

      const isMotorVehicle = partner.vehicleType !== VehicleType.BICYCLE;

      const profilePhoto = docs.find(d => d.documentType === DocumentType.PROFILE_PHOTO);
      const dl = docs.find(d => d.documentType === DocumentType.DRIVERS_LICENSE);
      const rc = docs.find(d => d.documentType === DocumentType.VEHICLE_RC);
      const insurance = docs.find(d => d.documentType === DocumentType.VEHICLE_INSURANCE);

      if (!profilePhoto || profilePhoto.verificationStatus !== DocumentVerificationStatus.VERIFIED) {
        throw new BadRequestException('Profile Photo must be verified.');
      }

      if (isMotorVehicle) {
        if (!dl || dl.verificationStatus !== DocumentVerificationStatus.VERIFIED) {
          throw new BadRequestException("Driver's License must be verified for motor vehicles.");
        }
        if (!rc || rc.verificationStatus !== DocumentVerificationStatus.VERIFIED) {
          throw new BadRequestException('Vehicle RC must be verified for motor vehicles.');
        }
        if (!insurance || insurance.verificationStatus !== DocumentVerificationStatus.VERIFIED) {
          throw new BadRequestException('Vehicle Insurance must be verified for motor vehicles.');
        }
      }

      const bankRepo = this.dataSource.getRepository(DeliveryPartnerBankDetails);
      const bankDetails = await bankRepo.findOne({ where: { deliveryPartnerId: id } });
      if (!bankDetails) {
        throw new BadRequestException('Bank/payout details must be configured.');
      }

      partner.accountStatus = DeliveryPartnerAccountStatus.APPROVED;
      partner.isVerified = true;
      partner.statusReason = null;
    } else if (dto.status === DeliveryPartnerAccountStatus.ACTION_REQUIRED) {
      if (!dto.reason || !dto.reason.trim()) {
        throw new BadRequestException('A reason is required when marking account action required.');
      }
      partner.accountStatus = DeliveryPartnerAccountStatus.ACTION_REQUIRED;
      partner.statusReason = dto.reason.trim();
      partner.isVerified = false;
      partner.isOnline = false;
      partner.isAvailable = false;
    } else if (dto.status === DeliveryPartnerAccountStatus.SUSPENDED) {
      if (!dto.reason || !dto.reason.trim()) {
        throw new BadRequestException('A reason is required when suspending partner.');
      }
      partner.accountStatus = DeliveryPartnerAccountStatus.SUSPENDED;
      partner.statusReason = dto.reason.trim();
      partner.isOnline = false;
      partner.isAvailable = false;
    }

    return await this.partnerRepository.save(partner);
  }

  async updateOnlineStatus(userId: number, isOnline: boolean): Promise<any> {
    const partner = await this.partnerRepository.findOne({
      where: { userId },
    });

    if (!partner) {
      throw new NotFoundException(`Delivery partner profile not found.`);
    }

    const sessionRepo = this.dataSource.getRepository(DeliveryPartnerOnlineSession);

    if (isOnline) {
      const canonicalStatus = partner.accountStatus || (partner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);
      if (
        canonicalStatus !== DeliveryPartnerAccountStatus.APPROVED ||
        partner.isVerified !== true ||
        partner.isActive !== true
      ) {
        throw new ForbiddenException('Delivery partner account is not approved or verified.');
      }
      
      // Start session if transitioning from offline to online
      if (!partner.isOnline) {
        const newSession = sessionRepo.create({
          deliveryPartnerId: partner.id,
          startTime: new Date(),
        });
        await sessionRepo.save(newSession);
      }

      partner.isOnline = true;
      partner.isAvailable = true;
      partner.lastHeartbeatAt = new Date();
      
      // Trigger a safe dispatch attempt for waiting matching orders
      this.triggerDispatchForWaitingOrders(partner).catch(err => {
        console.error('[Dispatch waiting orders error]:', err);
      });
    } else {
      // 1. Check if they have an ACCEPTED active assignment
      const activeAccepted = await this.assignmentRepository.findOne({
        where: {
          deliveryPartnerId: partner.id,
          status: DeliveryAssignmentStatus.ACCEPTED,
          isActive: true
        },
        relations: ['order']
      });
      if (activeAccepted) {
        const order = activeAccepted.order;
        if (order && (order.orderStatus === 'cancelled' || order.orderStatus === 'delivered' || order.orderStatus === 'rejected')) {
          // Stale assignment! Deactivate it.
          activeAccepted.isActive = false;
          activeAccepted.unassignedAt = new Date();
          await this.assignmentRepository.save(activeAccepted);
        } else {
          throw new ConflictException('Complete or resolve the active delivery before going offline.');
        }
      }

      // 2. Check if they have any OFFERED assignment
      const activeOffered = await this.assignmentRepository.find({
        where: {
          deliveryPartnerId: partner.id,
          status: DeliveryAssignmentStatus.OFFERED,
          isActive: true
        }
      });
      for (const assignment of activeOffered) {
        assignment.status = DeliveryAssignmentStatus.CANCELLED;
        assignment.isActive = false;
        assignment.unassignedAt = new Date();
        await this.assignmentRepository.save(assignment);

        // Re-dispatch this order
        this.triggerDispatchForOrder(assignment.orderId).catch(err => {
          console.error(`[Dispatch Requeue Error] Failed to re-dispatch order ${assignment.orderId}:`, err);
        });
      }

      // Close open sessions if transitioning from online to offline
      if (partner.isOnline) {
        const openSessions = await sessionRepo.find({
          where: { deliveryPartnerId: partner.id, endTime: IsNull() }
        });
        const nowTime = new Date();
        for (const sess of openSessions) {
          sess.endTime = nowTime;
          await sessionRepo.save(sess);
        }
      }

      partner.isOnline = false;
      partner.isAvailable = false;
    }

    const savedPartner = await this.partnerRepository.save(partner);
    return {
      isOnline: savedPartner.isOnline,
      isAvailable: savedPartner.isAvailable,
      accountStatus: savedPartner.accountStatus || (savedPartner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING),
    };
  }

  // --- DISPATCH AND ASSIGNMENT LOGIC ---

  async triggerDispatchForOrder(orderId: number): Promise<void> {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['hotel'],
    });

    if (!order) {
      console.warn(`[Dispatch] Order ${orderId} not found.`);
      return;
    }

    // Do not dispatch if cancelled/rejected/delivered or already assigned
    if (
      order.orderStatus === 'cancelled' ||
      order.orderStatus === 'rejected' ||
      order.orderStatus === 'delivered' ||
      order.deliveryPartnerId
    ) {
      console.log(`[Dispatch] Order ${orderId} is not eligible for dispatch.`);
      return;
    }

    // Check if there is already an active OFFERED assignment for this order
    const activeOffer = await this.assignmentRepository.findOne({
      where: {
        orderId,
        status: DeliveryAssignmentStatus.OFFERED,
        isActive: true,
      },
    });

    if (activeOffer) {
      if (new Date() >= activeOffer.expiresAt) {
        console.log(`[Dispatch] Active offer ${activeOffer.id} has expired. Expirying it now.`);
        activeOffer.status = DeliveryAssignmentStatus.EXPIRED;
        activeOffer.isActive = false;
        activeOffer.unassignedAt = new Date();
        await this.assignmentRepository.save(activeOffer);

        await this.notificationsService.createPartnerNotification(
          activeOffer.deliveryPartnerId,
          'Offer Expired',
          `The offer for Order #${activeOffer.orderId} has expired.`,
          'assignment_expired',
          activeOffer.orderId,
          activeOffer.id
        ).catch(err => console.error('[Notification Expired Error]:', err));
        
        // Restore partner availability if still online
        const p = await this.partnerRepository.findOne({ where: { id: activeOffer.deliveryPartnerId } });
        if (p && p.isOnline) {
          p.isAvailable = true;
          await this.partnerRepository.save(p);
        }
      } else {
        console.log(`[Dispatch] Order ${orderId} already has an active pending offer.`);
        return;
      }
    }

    // Find all eligible delivery partners
    const eligiblePartners = await this.partnerRepository.find({
      where: {
        accountStatus: DeliveryPartnerAccountStatus.APPROVED,
        isVerified: true,
        isActive: true,
        isOnline: true,
        isAvailable: true,
      },
    });

    if (eligiblePartners.length === 0) {
      console.log(`[Dispatch] No eligible delivery partners online for order ${orderId}.`);
      return;
    }

    // Exclude riders who already declined this order during the current cycle
    const previousDeclined = await this.assignmentRepository.find({
      where: {
        orderId,
        status: DeliveryAssignmentStatus.DECLINED,
      },
      select: ['deliveryPartnerId'],
    });
    const declinedPartnerIds = previousDeclined.map(a => a.deliveryPartnerId);

    const candidates = eligiblePartners.filter(
      p => !declinedPartnerIds.includes(p.id)
    );

    if (candidates.length === 0) {
      console.log(`[Dispatch] All eligible delivery partners have declined order ${orderId}.`);
      return;
    }

    // Zone Matching & Scoring
    const hotelArea = order.hotel?.area?.trim().toLowerCase();
    const deliveryArea = order.deliveryArea?.trim().toLowerCase();

    const scoredCandidates = candidates.map(partner => {
      let score = 0;
      const pref = partner.preferredZone?.trim().toLowerCase();
      const sec = partner.secondaryZone?.trim().toLowerCase();

      if (pref && (pref === hotelArea || pref === deliveryArea)) {
        score = 2;
      } else if (sec && (sec === hotelArea || sec === deliveryArea)) {
        score = 1;
      }
      return { partner, score };
    });

    const matchingCandidates = scoredCandidates.filter(c => c.score > 0);

    if (matchingCandidates.length === 0) {
      console.log(`[Dispatch] No candidates matched zone constraints for order ${orderId}.`);
      return;
    }

    matchingCandidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.partner.id - b.partner.id;
    });

    const chosenPartner = matchingCandidates[0].partner;

    // Create the OFFERED assignment
    const offeredAt = new Date();
    const expiresAt = new Date(offeredAt.getTime() + 23 * 1000); // 23 seconds

    const newAssignment = this.assignmentRepository.create({
      orderId,
      deliveryPartnerId: chosenPartner.id,
      isActive: true,
      status: DeliveryAssignmentStatus.OFFERED,
      offeredAt,
      expiresAt,
      assignedAt: offeredAt,
    });

    await this.assignmentRepository.save(newAssignment);
    console.log(`[Dispatch] Successfully offered order ${orderId} to partner ${chosenPartner.id}.`);
  }

  async triggerDispatchForWaitingOrders(partner: DeliveryPartner): Promise<void> {
    const orderRepo = this.dataSource.getRepository(Order);
    const waitingOrders = await orderRepo.createQueryBuilder('order')
      .where('order.orderStatus = :status AND order.deliveryPartnerId IS NULL', {
        status: OrderStatus.ACCEPTED,
      })
      .getMany();

    for (const order of waitingOrders) {
      await this.triggerDispatchForOrder(order.id);
    }
  }

  async releaseRiderForOrder(orderId: number, event: 'DELIVERED' | 'CANCELLED'): Promise<void> {
    const activeAssignments = await this.assignmentRepository.find({
      where: { orderId, status: DeliveryAssignmentStatus.ACCEPTED, isActive: true },
    });

    const now = new Date();
    for (const assignment of activeAssignments) {
      assignment.isActive = false;
      assignment.unassignedAt = now;
      if (event === 'CANCELLED') {
        assignment.status = DeliveryAssignmentStatus.CANCELLED;
      }
      await this.assignmentRepository.save(assignment);

      const partner = await this.partnerRepository.findOne({
        where: { id: assignment.deliveryPartnerId }
      });
      if (partner && partner.isOnline) {
        partner.isAvailable = true;
        await this.partnerRepository.save(partner);
      }
    }
  }

  async getIncomingAssignment(userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: {
        deliveryPartnerId: partner.id,
        status: DeliveryAssignmentStatus.OFFERED,
        isActive: true,
      },
      relations: ['order', 'order.hotel', 'order.items', 'order.items.customizations'],
      order: { id: 'DESC' }
    });

    if (!assignment) {
      return { assignment: null };
    }

    if (new Date() >= assignment.expiresAt) {
      assignment.status = DeliveryAssignmentStatus.EXPIRED;
      assignment.isActive = false;
      assignment.unassignedAt = new Date();
      await this.assignmentRepository.save(assignment);

      const orderNo = assignment.order ? (assignment.order.orderNumber || assignment.order.id) : assignment.orderId;
      await this.notificationsService.createPartnerNotification(
        partner.id,
        'Offer Expired',
        `The offer for Order #${orderNo} has expired.`,
        'assignment_expired',
        assignment.orderId,
        assignment.id
      ).catch(err => console.error('[Notification Expired Error]:', err));
      
      partner.isAvailable = true;
      await this.partnerRepository.save(partner);
      
      this.triggerDispatchForOrder(assignment.orderId).catch(err => {
        console.error(`[Dispatch Requeue Error] Failed to re-dispatch order ${assignment.orderId}:`, err);
      });

      return { assignment: null };
    }

    const order = assignment.order;
    const itemCount = order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;

    // Calculate Partner Estimated Earning using canonical PaymentsService helper
    const estimatedPartnerEarning = this.paymentsService.calculatePartnerEarning(Number(order.deliveryFee || 0));

    return {
      assignment: {
        id: assignment.id,
        status: assignment.status,
        offeredAt: assignment.offeredAt,
        expiresAt: assignment.expiresAt,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          // Restaurant details
          restaurantName: order.hotel?.name || 'QuickBite Kitchen',
          pickupAddress: order.hotel?.address || 'Near Fort Road, Kannur',
          restaurantLatitude: order.hotel?.latitude ? Number(order.hotel.latitude) : null,
          restaurantLongitude: order.hotel?.longitude ? Number(order.hotel.longitude) : null,
          
          // Customer details (Checkout Address Snapshot)
          customerName: order.deliveryRecipientName,
          customerPhoneMaskedOrSafe: order.deliveryPhoneNumber ? (order.deliveryPhoneNumber.slice(0, 5) + '*****') : '*****',
          deliveryAddressLine1: order.deliveryAddressLine1,
          deliveryAddressLine2: order.deliveryAddressLine2 || null,
          deliveryLandmark: order.deliveryLandmark || null,
          deliveryCity: order.deliveryCity,
          deliveryPincode: order.deliveryPincode,
          deliveryLatitude: order.deliveryLatitude ? Number(order.deliveryLatitude) : null,
          deliveryLongitude: order.deliveryLongitude ? Number(order.deliveryLongitude) : null,
          
          // Payout Estimate
          estimatedPartnerEarning,
          
          // Payment
          paymentMethod: order.paymentMethod,
          amount: Number(order.totalAmount),
          itemCount,
          cashCollectedAt: order.cashCollectedAt,
          paymentStatus: order.paymentStatus,
          
          // Order Items
          items: order.items ? order.items.map(item => ({
            id: item.id,
            foodName: item.foodName,
            quantity: item.quantity,
            lineTotal: Number(item.lineTotal),
            customizations: item.customizations ? item.customizations.map(c => ({
              id: c.id,
              groupName: c.groupName,
              choiceName: c.choiceName,
              additionalPrice: Number(c.additionalPrice)
            })) : []
          })) : []
        }
      }
    };
  }  async acceptAssignment(userId: number, assignmentId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const assignment = await manager.findOne(DeliveryAssignment, {
        where: { id: assignmentId, deliveryPartnerId: partner.id },
        lock: { mode: 'pessimistic_write' }
      });
      
      if (!assignment) {
        throw new NotFoundException('Assignment not found.');
      }
      
      if (assignment.status !== DeliveryAssignmentStatus.OFFERED) {
        throw new ConflictException('Assignment is no longer offered.');
      }
      
      if (new Date() >= assignment.expiresAt) {
        assignment.status = DeliveryAssignmentStatus.EXPIRED;
        assignment.isActive = false;
        await manager.save(DeliveryAssignment, assignment);
        
        partner.isAvailable = true;
        await manager.save(DeliveryPartner, partner);
        
        throw new BadRequestException('Assignment has expired.');
      }
      
      const order = await manager.findOne(Order, {
        where: { id: assignment.orderId },
        lock: { mode: 'pessimistic_write' }
      });
      
      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      
      if (order.deliveryPartnerId) {
        throw new ConflictException('Order already has an assigned rider.');
      }
      
      if (
        partner.accountStatus !== DeliveryPartnerAccountStatus.APPROVED ||
        !partner.isVerified ||
        !partner.isActive ||
        !partner.isOnline ||
        !partner.isAvailable
      ) {
        throw new BadRequestException('Rider is no longer eligible or available.');
      }
      
      assignment.status = DeliveryAssignmentStatus.ACCEPTED;
      assignment.respondedAt = new Date();
      await manager.save(DeliveryAssignment, assignment);
      
      order.deliveryPartnerId = partner.id;
      await manager.save(Order, order);
      
      partner.isAvailable = false;
      await manager.save(DeliveryPartner, partner);
      
      await manager.createQueryBuilder()
        .update(DeliveryAssignment)
        .set({
          status: DeliveryAssignmentStatus.CANCELLED,
          isActive: false,
          unassignedAt: new Date(),
        })
        .where('orderId = :orderId AND id != :id AND status = :status', {
          orderId: order.id,
          id: assignment.id,
          status: DeliveryAssignmentStatus.OFFERED,
        })
        .execute();
      
      return {
        message: 'Assignment accepted successfully',
        assignment,
        order,
      };
    });

    await this.notificationsService.createPartnerNotification(
      partner.id,
      'Delivery Request Accepted',
      `You have accepted the delivery for Order #${result.order.orderNumber || result.order.id}. Please proceed to the restaurant.`,
      'assignment_accepted',
      result.order.id,
      result.assignment.id
    ).catch(err => console.error('[Notification Accept Error]:', err));

    return {
      message: result.message,
      assignment: result.assignment,
    };
  }

  async declineAssignment(userId: number, assignmentId: number, declineReason?: string): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, deliveryPartnerId: partner.id }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    if (assignment.status !== DeliveryAssignmentStatus.OFFERED) {
      throw new ConflictException('Assignment is no longer offered.');
    }

    assignment.status = DeliveryAssignmentStatus.DECLINED;
    assignment.respondedAt = new Date();
    assignment.isActive = false;
    assignment.declineReason = declineReason || 'Declined by rider';
    await this.assignmentRepository.save(assignment);

    partner.isAvailable = true;
    await this.partnerRepository.save(partner);

    this.triggerDispatchForOrder(assignment.orderId).catch(err => {
      console.error(`[Dispatch Requeue Error] Failed to dispatch order ${assignment.orderId}:`, err);
    });

    return {
      message: 'Assignment declined successfully',
      assignment,
    };
  }

  async getActiveDelivery(userId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: {
        deliveryPartnerId: partner.id,
        status: DeliveryAssignmentStatus.ACCEPTED,
        isActive: true,
      },
      relations: ['order', 'order.hotel', 'order.items'],
      order: { id: 'DESC' }
    });

    if (!assignment) {
      return { assignment: null };
    }

    const order = assignment.order;
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'delivered' || order.orderStatus === 'rejected') {
      assignment.isActive = false;
      assignment.unassignedAt = new Date();
      await this.assignmentRepository.save(assignment);
      
      partner.isAvailable = true;
      await this.partnerRepository.save(partner);
      
      return { assignment: null };
    }

    const itemCount = order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;

    return {
      assignment: {
        id: assignment.id,
        status: assignment.status,
        offeredAt: assignment.offeredAt,
        expiresAt: assignment.expiresAt,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          restaurantName: order.hotel?.name || 'QuickBite Kitchen',
          restaurantPhoneNumber: order.hotel?.phoneNumber || null,
          pickupAddress: order.hotel?.address || 'Near Fort Road, Kannur',
          deliveryAddress: `${order.deliveryAddressLine1}${order.deliveryAddressLine2 ? ', ' + order.deliveryAddressLine2 : ''}`,
          customerName: order.deliveryRecipientName,
          customerPhoneNumber: order.deliveryPhoneNumber || null,
          customerPhoneMaskedOrSafe: order.deliveryPhoneNumber ? (order.deliveryPhoneNumber.slice(0, 5) + '*****') : '*****',
          paymentMethod: order.paymentMethod,
          amount: Number(order.totalAmount),
          itemCount,
          cashCollectedAt: order.cashCollectedAt,
          paymentStatus: order.paymentStatus,
          restaurantLatitude: order.hotel?.latitude ? parseFloat(order.hotel.latitude.toString()) : null,
          restaurantLongitude: order.hotel?.longitude ? parseFloat(order.hotel.longitude.toString()) : null,
          deliveryLatitude: order.deliveryLatitude ? parseFloat(order.deliveryLatitude.toString()) : null,
          deliveryLongitude: order.deliveryLongitude ? parseFloat(order.deliveryLongitude.toString()) : null,
          deliveryPinRequired: !!order.deliveryPinHash,
          deliveryPinVerified: !!order.deliveryPinVerifiedAt,
          items: order.items ? order.items.map(item => ({
            id: item.id,
            foodName: item.foodName,
            quantity: item.quantity,
          })) : [],
        }
      }
    };
  }

  async verifyActiveDeliveryPin(
    userId: number,
    pin: string,
    bypassLatitude?: number,
    bypassLongitude?: number,
    bypassDistance?: number,
    bypassTimestamp?: string
  ): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: {
        deliveryPartnerId: partner.id,
        status: DeliveryAssignmentStatus.ACCEPTED,
        isActive: true,
      },
      relations: ['order'],
      order: { id: 'DESC' }
    });

    if (!assignment || !assignment.order) {
      throw new NotFoundException('No active delivery assignment found for this partner.');
    }

    const order = assignment.order;

    if (order.orderStatus === 'cancelled' || order.orderStatus === 'rejected') {
      throw new BadRequestException('This order has been cancelled or rejected.');
    }

    if (order.orderStatus === 'delivered') {
      return { verified: true, verifiedAt: order.deliveryPinVerifiedAt };
    }

    if (order.orderStatus !== 'out_for_delivery') {
      throw new BadRequestException('Delivery PIN verification is only allowed when out for delivery.');
    }

    if (order.deliveryPinVerifiedAt) {
      return { verified: true, verifiedAt: order.deliveryPinVerifiedAt };
    }

    if (!order.deliveryPinHash) {
      throw new BadRequestException('This order does not require PIN verification.');
    }

    // Lockout check
    if (order.deliveryPinLockedUntil && new Date() < new Date(order.deliveryPinLockedUntil)) {
      throw new BadRequestException('Too many attempts. Please wait a moment and try again.');
    }

    const decryptedPin = decryptPin(order.deliveryPinHash);
    if (decryptedPin !== pin) {
      order.deliveryPinAttemptCount = (order.deliveryPinAttemptCount || 0) + 1;
      if (order.deliveryPinAttemptCount >= 5) {
        order.deliveryPinLockedUntil = new Date(Date.now() + 60 * 1000); // 60s lockout
        await this.orderRepository.save(order);
        throw new BadRequestException('Too many attempts. Please wait a moment and try again.');
      } else {
        await this.orderRepository.save(order);
        throw new BadRequestException('Incorrect delivery PIN. Please check with the customer.');
      }
    }

    // Success
    order.deliveryPinAttemptCount = 0;
    order.deliveryPinLockedUntil = null;
    order.deliveryPinVerifiedAt = new Date();

    if (bypassLatitude !== undefined && bypassLongitude !== undefined) {
      order.deliveryBypassLatitude = bypassLatitude;
      order.deliveryBypassLongitude = bypassLongitude;
      order.deliveryBypassDistance = bypassDistance;
      order.deliveryBypassTimestamp = bypassTimestamp ? new Date(bypassTimestamp) : new Date();
    }

    await this.orderRepository.save(order);

    return {
      verified: true,
      verifiedAt: order.deliveryPinVerifiedAt,
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Math.round(d * 10) / 10; // Round to 1 decimal place
  }
}
