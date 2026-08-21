import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DeliveryPartner } from './delivery-partner.entity';
import { DeliveryAssignment } from './delivery-assignment.entity';
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

@Injectable()
export class DeliveryPartnersService {
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
  ) {}

  async adminCreate(dto: AdminCreateDeliveryPartnerDto): Promise<DeliveryPartner> {
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

    // Perform database writes inside transaction
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const partnerRepo = manager.getRepository(DeliveryPartner);

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

      // Hash password using 10 rounds bcrypt rounds configuration
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

      return await partnerRepo.save(newPartner);
    });
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

  async getProfile(userId: number): Promise<DeliveryPartner> {
    const profile = await this.partnerRepository.findOne({
      where: { userId, isActive: true },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException(
        'Delivery partner profile not found or is inactive',
      );
    }
    return profile;
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
  ): Promise<any[]> {
    const whereClause: any = {};
    if (online !== undefined) whereClause.isOnline = online;
    if (available !== undefined) whereClause.isAvailable = available;
    if (verified !== undefined) whereClause.isVerified = verified;
    if (active !== undefined) whereClause.isActive = active;

    const partners = await this.partnerRepository.find({
      where: whereClause,
      relations: ['user'],
    });

    return partners.map((p) => ({
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
    }));
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

    return {
      partner: {
        id: partner.id,
        userId: partner.userId,
        phoneNumber: partner.phoneNumber,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        licenseNumber: partner.licenseNumber,
        isVerified: partner.isVerified,
        isOnline: partner.isOnline,
        isAvailable: partner.isAvailable,
        isActive: partner.isActive,
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
}
