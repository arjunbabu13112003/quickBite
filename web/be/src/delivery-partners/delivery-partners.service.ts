import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { unlinkSync, existsSync } from 'fs';
import { DeliveryPartner, DeliveryPartnerAccountStatus } from './delivery-partner.entity';
import { DeliveryPartnerDocument, DocumentType, DocumentVerificationStatus } from './delivery-partner-document.entity';
import { DeliveryPartnerBankDetails } from './delivery-partner-bank-details.entity';
import { DeliveryAssignment, DeliveryAssignmentStatus } from './delivery-assignment.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { UserRole } from '../users/user-role.enum';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentsService } from '../payments/payments.service';
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

@Injectable()
export class DeliveryPartnersService implements OnModuleInit {
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
  ) {}

  async onModuleInit() {
    await this.runLegacyStatusBackfill();
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
        user: profile.user ? {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          mobileNumber: profile.user.mobileNumber,
          role: profile.user.role
        } : null
      }
    };
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

    if (!partner.isVerified || !partner.isOnline || !partner.isAvailable) {
      throw new BadRequestException(
        'Delivery partner is not verified, online or available',
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

    return await this.dataSource.transaction(async (manager) => {
      partner.isAvailable = false;
      await manager.save(DeliveryPartner, partner);

      const assignment = manager.create(DeliveryAssignment, {
        orderId,
        deliveryPartnerId: partnerId,
        isActive: true,
      });

      return await manager.save(DeliveryAssignment, assignment);
    });
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
      return {
        message: `Order status updated to ${nextStatus}`,
        orderId: order.id,
        orderStatus: order.orderStatus,
      };
    }

    if (nextStatus === 'delivered') {
      // Step 1: Commit the delivery state change atomically.
      // The finalization hook is called AFTER this transaction commits so that
      // checkAndFinalizeOrderAllocation sees the fresh orderStatus=delivered row.
      const result = await this.dataSource.transaction(async (manager) => {
        order.orderStatus = OrderStatus.DELIVERED;
        order.deliveredAt = now;

        // NOTE: COD cash collection is a separate explicit action.
        // Delivery completion alone does NOT mark paymentStatus=paid for COD.
        // The partner must call POST /orders/:orderId/cod/collect separately.

        assignment.isActive = false;
        assignment.unassignedAt = now;

        const freshPartner = await manager.findOne(DeliveryPartner, {
          where: { id: partner.id },
        });

        if (
          freshPartner &&
          freshPartner.isActive &&
          freshPartner.isVerified &&
          freshPartner.isOnline
        ) {
          freshPartner.isAvailable = true;
        } else if (freshPartner) {
          freshPartner.isAvailable = false;
        }

        await manager.save(Order, order);
        await manager.save(DeliveryAssignment, assignment);
        if (freshPartner) {
          await manager.save(DeliveryPartner, freshPartner);
        }

        return {
          message: 'Order status updated to delivered successfully',
          orderId: order.id,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
        };
      });

      // Step 2: After the delivery transaction commits, trigger the financial
      // finalization check. This opens its own transaction inside PaymentsService.
      //
      // Finalization will proceed only if BOTH conditions are true:
      //   orderStatus === 'delivered'  (just set above)
      //   paymentStatus === 'paid'     (set by COD collection or online capture)
      //
      // Safe to call here because:
      //   - The delivery row is fully committed before this point
      //   - PaymentsService.checkAndFinalizeOrderAllocation is idempotent
      //   - For unpaid COD orders paymentStatus is still 'pending' → no-op
      //   - For pre-paid orders (online or COD already collected) → finalizes once
      await this.paymentsService.checkAndFinalizeOrderAllocation(order.id);

      return result;
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

    const history = assignments
      .filter((a) => a.order && a.order.orderStatus === OrderStatus.DELIVERED)
      .map((a) => {
        const order = a.order;
        const hotel = order.hotel;
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
        };
      });

    return history.sort(
      (a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime(),
    );
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

    if (isOnline) {
      const canonicalStatus = partner.accountStatus || (partner.isVerified ? DeliveryPartnerAccountStatus.APPROVED : DeliveryPartnerAccountStatus.PENDING);
      if (
        canonicalStatus !== DeliveryPartnerAccountStatus.APPROVED ||
        partner.isVerified !== true ||
        partner.isActive !== true
      ) {
        throw new ForbiddenException('Delivery partner account is not approved or verified.');
      }
      partner.isOnline = true;
      partner.isAvailable = true;
      
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
        }
      });
      if (activeAccepted) {
        throw new ConflictException('Complete or resolve the active delivery before going offline.');
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
      relations: ['order', 'order.hotel', 'order.items'],
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
      
      partner.isAvailable = true;
      await this.partnerRepository.save(partner);
      
      this.triggerDispatchForOrder(assignment.orderId).catch(err => {
        console.error(`[Dispatch Requeue Error] Failed to re-dispatch order ${assignment.orderId}:`, err);
      });

      return { assignment: null };
    }

    const order = assignment.order;
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
          restaurantName: order.hotel?.name || 'QuickBite Kitchen',
          pickupAddress: order.hotel?.address || 'Near Fort Road, Kannur',
          deliveryAddress: `${order.deliveryAddressLine1}${order.deliveryAddressLine2 ? ', ' + order.deliveryAddressLine2 : ''}`,
          customerName: order.deliveryRecipientName,
          customerPhoneMaskedOrSafe: order.deliveryPhoneNumber ? (order.deliveryPhoneNumber.slice(0, 5) + '*****') : '*****',
          paymentMethod: order.paymentMethod,
          amount: Number(order.totalAmount),
          itemCount,
        }
      }
    };
  }

  async acceptAssignment(userId: number, assignmentId: number): Promise<any> {
    const partner = await this.partnerRepository.findOne({ where: { userId } });
    if (!partner) {
      throw new NotFoundException('Delivery partner not found.');
    }

    return await this.dataSource.transaction(async (manager) => {
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
      };
    });
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
          restaurantName: order.hotel?.name || 'QuickBite Kitchen',
          pickupAddress: order.hotel?.address || 'Near Fort Road, Kannur',
          deliveryAddress: `${order.deliveryAddressLine1}${order.deliveryAddressLine2 ? ', ' + order.deliveryAddressLine2 : ''}`,
          customerName: order.deliveryRecipientName,
          customerPhoneMaskedOrSafe: order.deliveryPhoneNumber ? (order.deliveryPhoneNumber.slice(0, 5) + '*****') : '*****',
          paymentMethod: order.paymentMethod,
          amount: Number(order.totalAmount),
          itemCount,
        }
      }
    };
  }
}
