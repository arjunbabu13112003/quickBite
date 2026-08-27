import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderItemCustomization } from './order-item-customization.entity';
import { Address } from '../addresses/address.entity';
import { Cart } from '../cart/cart.entity';
import { CartItem } from '../cart/cart-item.entity';
import { FoodCustomizationChoice } from '../food-customizations/food-customization-choice.entity';
import { FoodCustomizationGroup } from '../food-customizations/food-customization-group.entity';
import { Hotel } from '../hotels/hotel.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentStatus } from './enums/payment-status.enum';
import { OrderStatus } from './enums/order-status.enum';
import { OffersService } from '../offers/offers.service';
import { resolveHotelOfferForFood } from '../offers/offer-pricing.helper';
import { Food } from '../foods/food.entity';
import { Offer } from '../offers/offer.entity';
import { Store99Campaign } from '../offers/store99-campaign.entity';
import { DeliveryPartnersService } from '../delivery-partners/delivery-partners.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto.scryptSync('QuickBiteSecretKeyForPinEncryption', 'salt', 32);
const IV_LENGTH = 16;

function encryptPin(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptPin(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Failed to decrypt PIN:', err);
    return '';
  }
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(FoodCustomizationGroup)
    private readonly groupRepository: Repository<FoodCustomizationGroup>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
    private readonly dataSource: DataSource,
    private readonly offersService: OffersService,
    private readonly deliveryPartnersService: DeliveryPartnersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async calculateEffectiveFoodPrice(food: Food, selectedCampaignId?: number, now = new Date()): Promise<number> {
    let dynamicOfferPrice = null;
    if (selectedCampaignId) {
      const activeCampaignItems = await this.dataSource.query(`
        SELECT item."foodId", camp.id as "campaignId", camp.name, camp.price, camp."offerType",
               camp."flatDiscountAmount", camp."percentageDiscount", camp."maxDiscount"
        FROM store_99_items item
        JOIN store_99_campaigns camp ON item."campaignId" = camp.id
        JOIN hotel_campaign_participations part ON part."campaignId" = camp.id AND part."hotelId" = item."hotelId"
        WHERE item."foodId" = $1
          AND item."hotelId" = $2
          AND camp.id = $3
          AND camp."isActive" = true
          AND camp."startAt" <= $4
          AND camp."endAt" >= $5
          AND part.status = 'participating'
      `, [food.id, food.hotelId, selectedCampaignId, now, now]);

      if (activeCampaignItems && activeCampaignItems.length > 0) {
        let bestPrice = Number(food.price);
        activeCampaignItems.forEach((c: any) => {
          const orig = Number(food.price) || 0;
          const type = c.offerType || 'FIXED_PRICE';
          let discountPrice = orig;
          if (type === 'FIXED_PRICE') {
            discountPrice = Number(c.price) || 0;
          } else if (type === 'FLAT_DISCOUNT') {
            discountPrice = Math.max(0, orig - (Number(c.flatDiscountAmount) || 0));
          } else if (type === 'PERCENTAGE_DISCOUNT') {
            let disc = orig * (Number(c.percentageDiscount) || 0) / 100;
            if (c.maxDiscount) {
              disc = Math.min(disc, Number(c.maxDiscount));
            }
            discountPrice = Math.max(0, orig - disc);
          }
          if (discountPrice < bestPrice) {
            bestPrice = discountPrice;
          }
        });
        dynamicOfferPrice = bestPrice;
      }
    }

    const hotelOffer = await resolveHotelOfferForFood(this.dataSource, food, now);
    if (hotelOffer.offerId !== null) {
      if (dynamicOfferPrice === null || (hotelOffer.offerPrice !== null && hotelOffer.offerPrice < dynamicOfferPrice)) {
        dynamicOfferPrice = hotelOffer.offerPrice;
      }
    }
    return dynamicOfferPrice !== null ? dynamicOfferPrice : parseFloat(food.price.toString());
  }

  async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
    // 1. Verify address ownership and activity
    const address = await this.addressRepository.findOne({
      where: { id: dto.addressId, userId, isActive: true },
    });
    if (!address) {
      throw new NotFoundException(
        `Delivery address with ID ${dto.addressId} not found`,
      );
    }

    // 2. Verify customer cart is not empty
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: [
        'hotel',
        'items',
        'items.food',
        'items.food.category',
        'items.food.hotel',
        'items.customizationChoices',
        'items.customizationChoices.foodCustomizationChoice',
        'items.customizationChoices.foodCustomizationChoice.group',
      ],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // 3. Verify hotel status
    const hotel = cart.hotel;
    if (!hotel || !hotel.isActive) {
      throw new BadRequestException(
        'The hotel associated with this order is inactive',
      );
    }
    if (!hotel.isOpen) {
      throw new BadRequestException('The hotel is currently closed');
    }
    if (!hotel.acceptsOrders) {
      throw new BadRequestException(
        'The hotel is currently not accepting orders',
      );
    }

    // 4. Revalidate foods and customizations under current db state
    const orderItemsData = [];
    let calculatedSubtotal = 0;

    for (const item of cart.items) {
      const food = item.food;
      if (!food || !food.isActive || !food.isAvailable) {
        throw new BadRequestException(
          `Food "${item.food?.name || 'unknown'}" is inactive or unavailable. Please review your cart.`,
        );
      }
      if (food.hotelId !== cart.hotelId) {
        throw new BadRequestException(
          `Food "${food.name}" belongs to a different hotel. Please review your cart.`,
        );
      }
      if (!food.category || !food.category.isActive) {
        throw new BadRequestException(
          `Food "${food.name}" category is inactive. Please review your cart.`,
        );
      }

      // Revalidate customizations selection
      const activeGroups = await this.groupRepository.find({
        where: { foodId: food.id, isActive: true },
        relations: ['choices'],
      });

      const allValidChoiceIds = new Set<number>();
      const choiceIdToObj = new Map<number, FoodCustomizationChoice>();

      activeGroups.forEach((group) => {
        if (group.choices) {
          group.choices.forEach((choice) => {
            if (choice.isActive && choice.isAvailable) {
              allValidChoiceIds.add(choice.id);
              choice.group = group; // Inject group reference for pricing logic
              choiceIdToObj.set(choice.id, choice);
            }
          });
        }
      });

      const selectedChoiceIds = (item.customizationChoices || []).map(
        (c) => c.choiceId,
      );

      // Verify selected choice IDs exist and are active
      for (const choiceId of selectedChoiceIds) {
        if (!allValidChoiceIds.has(choiceId)) {
          throw new BadRequestException(
            `Selected customization for "${food.name}" is no longer available. Please review your cart.`,
          );
        }
      }

      // Verify selection ranges per active group
      for (const group of activeGroups) {
        const groupChoiceIds = (group.choices || [])
          .filter((c) => c.isActive && c.isAvailable)
          .map((c) => c.id);

        const selectedCount = selectedChoiceIds.filter((id) =>
          groupChoiceIds.includes(id),
        ).length;

        if (group.isRequired && selectedCount === 0) {
          throw new BadRequestException(
            `Group "${group.name}" requires at least 1 selection.`,
          );
        }

        if (group.selectionType === 'single' && selectedCount > 1) {
          throw new BadRequestException(
            `Group "${group.name}" allows at most 1 selection.`,
          );
        }
      }

      // Price calculation
      const unitPrice = await this.calculateEffectiveFoodPrice(food, dto.campaignId);
      let customizationPrice = 0;
      const customizationsSnapshots = [];

      selectedChoiceIds.forEach((choiceId) => {
        const choiceObj = choiceIdToObj.get(choiceId);
        if (choiceObj) {
          const choicePrice = parseFloat(choiceObj.additionalPrice.toString());
          customizationPrice += choicePrice;
          customizationsSnapshots.push({
            groupName: choiceObj.group?.name || 'Customization',
            choiceName: choiceObj.name,
            additionalPrice: choicePrice,
          });
        }
      });

      const finalUnitPrice = parseFloat(
        (unitPrice + customizationPrice).toFixed(2),
      );
      const lineTotal = parseFloat((finalUnitPrice * item.quantity).toFixed(2));
      calculatedSubtotal += lineTotal;

      orderItemsData.push({
        foodId: food.id,
        categoryId: food.categoryId,
        foodName: food.name,
        foodImage: food.image,
        quantity: item.quantity,
        unitPrice,
        customizationPrice,
        finalUnitPrice,
        lineTotal,
        customizations: customizationsSnapshots,
      });
    }

    // 5. Total calculations
    const subtotal = parseFloat(calculatedSubtotal.toFixed(2));
    const deliveryFee = hotel.deliveryFee
      ? parseFloat(hotel.deliveryFee.toString())
      : 0;
    const taxAmount = 0;
    let discountAmount = 0;
    let finalDeliveryFee = deliveryFee;

    if (dto.couponCode) {
      const validation = await this.offersService.validateOfferInternal(
        dto.couponCode,
        hotel.id,
        userId,
        orderItemsData,
        subtotal,
        deliveryFee,
      );
      if (!validation.isValid) {
        throw new BadRequestException(validation.message || '❌ Invalid coupon code');
      }
      discountAmount = validation.discountAmount;
      finalDeliveryFee = validation.finalDeliveryFee;
    }

    if (dto.offerId) {
      const offer = await this.dataSource.getRepository(Offer).findOne({
        where: { id: dto.offerId, hotelId: hotel.id, isActive: true },
      });
      if (!offer) {
        throw new BadRequestException('❌ Selected offer is invalid or expired.');
      }
      const now = new Date();
      if (offer.startAt > now || offer.endAt < now) {
        throw new BadRequestException('❌ Offer is not currently active.');
      }
      if (offer.discountType === 'free_delivery') {
        const minOrder = Number(offer.minimumOrderValue) || 0;
        if (subtotal < minOrder) {
          throw new BadRequestException(`❌ Minimum order of ₹${minOrder} is required for Free Delivery.`);
        }
        if (offer.applicabilityType === 'foods') {
          const eligibleFoodIds = await this.dataSource.query(`
            SELECT "foodId" FROM offer_foods WHERE "offerId" = $1
          `, [offer.id]);
          const hasAppFood = orderItemsData.some(item => 
            eligibleFoodIds.some(f => Number(f.foodId) === Number(item.foodId))
          );
          if (!hasAppFood) {
            throw new BadRequestException('❌ No eligible items for this Free Delivery offer.');
          }
        } else if (offer.applicabilityType === 'categories') {
          const eligibleCatIds = await this.dataSource.query(`
            SELECT "categoryId" FROM offer_categories WHERE "offerId" = $1
          `, [offer.id]);
          const hasAppCat = orderItemsData.some(item => 
            eligibleCatIds.some(c => Number(c.categoryId) === Number(item.categoryId))
          );
          if (!hasAppCat) {
            throw new BadRequestException('❌ No eligible category items for this Free Delivery offer.');
          }
        }
        finalDeliveryFee = 0;
      }
    }

    if (dto.campaignId) {
      const campaign = await this.dataSource.getRepository(Store99Campaign).findOne({
        where: { id: dto.campaignId, isActive: true },
      });
      if (!campaign) {
        throw new BadRequestException('❌ Selected campaign is invalid or expired.');
      }
      const now = new Date();
      if (campaign.startAt > now || campaign.endAt < now) {
        throw new BadRequestException('❌ Campaign is not currently active.');
      }
      const participation = await this.dataSource.query(`
        SELECT 1 FROM hotel_campaign_participations 
        WHERE "campaignId" = $1 AND "hotelId" = $2 AND status = 'participating'
        LIMIT 1
      `, [campaign.id, hotel.id]);
      if (!participation || participation.length === 0) {
        throw new BadRequestException('❌ Restaurant is not participating in this campaign.');
      }

      console.log(`[DEBUG] Campaign ID: ${campaign.id}`);
      console.log(`[DEBUG] Campaign offerType: ${campaign.offerType}`);
      console.log(`[DEBUG] Campaign minimumOrder: ${campaign.minimumOrder}`);
      console.log(`[DEBUG] Order food IDs: ${orderItemsData.map(i => i.foodId).join(', ')}`);
      console.log(`[DEBUG] Quantities: ${orderItemsData.map(i => `${i.foodId}: x${i.quantity}`).join(', ')}`);
      console.log(`[DEBUG] Calculated backend subtotal: ${subtotal}`);

      if (campaign.offerType === 'FREE_DELIVERY') {
        const minOrder = Number(campaign.minimumOrder) || 0;
        let isEligible = subtotal >= minOrder;
        if (isEligible && orderItemsData.length > 0) {
          const eligibleItemsCount = await this.dataSource.query(`
            SELECT COUNT(id) as count FROM store_99_items 
            WHERE "campaignId" = $1 AND "hotelId" = $2 AND "foodId" IN (${orderItemsData.map(i => i.foodId).join(', ')})
          `, [campaign.id, hotel.id]);
          if (!eligibleItemsCount || Number(eligibleItemsCount[0].count) !== orderItemsData.length) {
            isEligible = false;
          }
        } else {
          isEligible = false;
        }

        console.log(`[DEBUG] Campaign minimum: ${minOrder}`);
        console.log(`[DEBUG] Qualifying Campaign subtotal: ${subtotal}`);
        console.log(`[DEBUG] Campaign Free Delivery eligible: ${isEligible}`);

        if (isEligible) {
          finalDeliveryFee = 0;
        }
      }
    }

    const totalAmount = parseFloat(
      Math.max(0, subtotal + finalDeliveryFee + taxAmount - discountAmount).toFixed(
        2,
      ),
    );

    // 6. Generate orderNumber (QB-YYYYMMDD-XXXXXX)
    const todayStr = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const randomStr = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const orderNumber = `QB-${todayStr}-${randomStr}`;

    // Generate secure random 4-digit numeric PIN
    const rawPin = crypto.randomInt(1000, 10000).toString();
    const encryptedPin = encryptPin(rawPin);

    // 7. Write transactional updates
    const result = await this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        orderNumber,
        userId,
        hotelId: hotel.id,
        addressId: address.id,
        subtotal,
        deliveryFee: finalDeliveryFee,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PLACED,
        customerNote: dto.customerNote,
        couponCode: dto.couponCode,
        // Delivery Address Snapshot
        deliveryRecipientName: address.recipientName,
        deliveryPhoneNumber: address.phoneNumber,
        deliveryAddressLine1: address.addressLine1,
        deliveryAddressLine2: address.addressLine2,
        deliveryLandmark: address.landmark,
        deliveryArea: address.area,
        deliveryCity: address.city,
        deliveryState: address.state,
        deliveryPincode: address.pincode,
        deliveryLatitude: address.latitude,
        deliveryLongitude: address.longitude,
        deliveryPinHash: encryptedPin,
        deliveryPinAttemptCount: 0,
      });

      const savedOrder = await manager.save(Order, order);

      for (const itemData of orderItemsData) {
        const orderItem = manager.create(OrderItem, {
          orderId: savedOrder.id,
          foodId: itemData.foodId,
          foodName: itemData.foodName,
          foodImage: itemData.foodImage,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          customizationPrice: itemData.customizationPrice,
          finalUnitPrice: itemData.finalUnitPrice,
          lineTotal: itemData.lineTotal,
        });

        const savedOrderItem = await manager.save(OrderItem, orderItem);

        if (itemData.customizations.length > 0) {
          const mappingEntities = itemData.customizations.map((c) =>
            manager.create(OrderItemCustomization, {
              orderItemId: savedOrderItem.id,
              groupName: c.groupName,
              choiceName: c.choiceName,
              additionalPrice: c.additionalPrice,
            }),
          );
          await manager.save(OrderItemCustomization, mappingEntities);
        }
      }

      // Clear cart items only for non-online orders (e.g. COD) immediately.
      // Online orders will clear the cart only after payment is verified successfully.
      if (dto.paymentMethod?.toLowerCase() !== 'online') {
        await manager.delete(CartItem, { cartId: cart.id });
        if (dto.couponCode) {
          await this.offersService.recordRedemption(savedOrder.id, manager);
        }
      }

      return savedOrder;
    });

    // Notify hotel admin on new order
    this.notificationsService.createHotelNotification(
      result.hotelId,
      'New Order Received',
      `A new order #${result.orderNumber} has been placed.`,
      result.id,
    ).catch(err => console.error('[Notification Error] Failed to notify hotel on new order:', err));

    return result;
  }

  async getOrders(userId: number): Promise<any[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['hotel', 'items'],
      order: { createdAt: 'DESC' },
    });

    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const assignments = await this.dataSource.getRepository('DeliveryAssignment').find({
      where: { orderId: In(orderIds), isActive: true },
      relations: ['deliveryPartner', 'deliveryPartner.user'],
    });

    return orders.map((order) => {
      const activeAssignment = assignments.find((a) => a.orderId === order.id);
      const { gstNumber: _, fssaiNumber: __, ...hotelPublic } = order.hotel;
      const itemCount = order.items
        ? order.items.reduce((sum, item) => sum + item.quantity, 0)
        : 0;

      const items = (order.items || []).map((item) => ({
        id: item.id,
        foodId: item.foodId,
        foodName: item.foodName,
        foodImage: item.foodImage,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
      }));

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        hotel: hotelPublic,
        subtotal: parseFloat(order.subtotal.toString()),
        deliveryFee: parseFloat(order.deliveryFee.toString()),
        taxAmount: parseFloat(order.taxAmount.toString()),
        discountAmount: parseFloat(order.discountAmount.toString()),
        totalAmount: parseFloat(order.totalAmount.toString()),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        placedAt: order.placedAt,
        createdAt: order.createdAt,
        itemCount,
        items,
        activeAssignment: activeAssignment
          ? {
              id: activeAssignment.id,
              deliveryPartner: activeAssignment.deliveryPartner
                ? {
                    id: activeAssignment.deliveryPartner.id,
                    phoneNumber: activeAssignment.deliveryPartner.phoneNumber,
                    vehicleType: activeAssignment.deliveryPartner.vehicleType,
                    vehicleNumber: activeAssignment.deliveryPartner.vehicleNumber,
                    user: activeAssignment.deliveryPartner.user
                      ? { name: activeAssignment.deliveryPartner.user.name }
                      : null,
                  }
                : null,
            }
          : null,
      };
    });
  }

  async getOrderDetails(userId: number, orderId: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['hotel', 'items', 'items.customizations'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const activeAssignment = await this.dataSource.getRepository('DeliveryAssignment').findOne({
      where: { orderId: orderId, isActive: true },
      relations: ['deliveryPartner', 'deliveryPartner.user'],
    });

    const { gstNumber: _, fssaiNumber: __, ...hotelPublic } = order.hotel;

    const items = (order.items || []).map((item) => {
      const customizations = (item.customizations || []).map((c) => ({
        groupName: c.groupName,
        choiceName: c.choiceName,
        additionalPrice: parseFloat(c.additionalPrice.toString()),
      }));

      return {
        id: item.id,
        foodName: item.foodName,
        foodImage: item.foodImage,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        customizationPrice: parseFloat(item.customizationPrice.toString()),
        finalUnitPrice: parseFloat(item.finalUnitPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
        customizations,
      };
    });

    const allowedStatuses = ['picked_up', 'out_for_delivery', 'delivered'];
    const deliveryPin = (allowedStatuses.includes(order.orderStatus) && order.deliveryPinHash)
      ? decryptPin(order.deliveryPinHash)
      : null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      hotel: hotelPublic,
      subtotal: parseFloat(order.subtotal.toString()),
      deliveryFee: parseFloat(order.deliveryFee.toString()),
      taxAmount: parseFloat(order.taxAmount.toString()),
      discountAmount: parseFloat(order.discountAmount.toString()),
      totalAmount: parseFloat(order.totalAmount.toString()),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      customerNote: order.customerNote,
      deliveryPin,
      placedAt: order.placedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
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
      items,
      activeAssignment: activeAssignment
        ? {
            id: activeAssignment.id,
            deliveryPartner: activeAssignment.deliveryPartner
              ? (() => {
                  const shouldShowLocation =
                    order.orderStatus === OrderStatus.OUT_FOR_DELIVERY &&
                    activeAssignment.status === 'ACCEPTED';
                  return {
                    id: activeAssignment.deliveryPartner.id,
                    phoneNumber: activeAssignment.deliveryPartner.phoneNumber,
                    vehicleType: activeAssignment.deliveryPartner.vehicleType,
                    vehicleNumber: activeAssignment.deliveryPartner.vehicleNumber,
                    currentLatitude: (shouldShowLocation && activeAssignment.deliveryPartner.currentLatitude)
                      ? parseFloat(activeAssignment.deliveryPartner.currentLatitude.toString())
                      : null,
                    currentLongitude: (shouldShowLocation && activeAssignment.deliveryPartner.currentLongitude)
                      ? parseFloat(activeAssignment.deliveryPartner.currentLongitude.toString())
                      : null,
                    locationUpdatedAt: shouldShowLocation
                      ? activeAssignment.deliveryPartner.locationUpdatedAt || null
                      : null,
                    user: activeAssignment.deliveryPartner.user
                      ? { name: activeAssignment.deliveryPartner.user.name }
                      : null,
                  };
                })()
              : null,
          }
        : null,
    };
  }

  // --- HOTEL ORDER MANAGEMENT ---

  async getHotelOrders(hotelId: number, status?: string): Promise<any[]> {
    const hotel = await this.hotelRepository.findOne({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }

    const whereClause: any = { hotelId };
    if (status) {
      const validStatuses = Object.values(OrderStatus);
      if (!validStatuses.includes(status as OrderStatus)) {
        throw new BadRequestException(`Invalid status filter: ${status}`);
      }
      whereClause.orderStatus = status;
    }

    const orders = await this.orderRepository.find({
      where: whereClause,
      relations: ['user', 'items'],
      order: { placedAt: 'DESC' },
    });

    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const assignments = await this.dataSource.getRepository('DeliveryAssignment').find({
      where: { orderId: In(orderIds), isActive: true },
      relations: ['deliveryPartner', 'deliveryPartner.user'],
    });

    return orders.map((order) => {
      const activeAssignment = assignments.find((a) => a.orderId === order.id);
      const itemCount = order.items
        ? order.items.reduce((sum, item) => sum + item.quantity, 0)
        : 0;
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        user: order.user
          ? {
              id: order.user.id,
              name: order.user.name,
              email: order.user.email,
            }
          : null,
        totalAmount: parseFloat(order.totalAmount.toString()),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        placedAt: order.placedAt,
        deliveryRecipientName: order.deliveryRecipientName,
        deliveryPhoneNumber: order.deliveryPhoneNumber,
        deliveryAddressLine1: order.deliveryAddressLine1,
        deliveryAddressLine2: order.deliveryAddressLine2,
        deliveryLandmark: order.deliveryLandmark,
        deliveryArea: order.deliveryArea,
        deliveryCity: order.deliveryCity,
        deliveryState: order.deliveryState,
        deliveryPincode: order.deliveryPincode,
        itemCount,
        items: order.items
          ? order.items.map((item) => ({
              id: item.id,
              foodName: item.foodName,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unitPrice.toString()),
              lineTotal: parseFloat(item.lineTotal.toString()),
            }))
          : [],
        activeAssignment: activeAssignment
          ? {
              id: activeAssignment.id,
              assignedAt: activeAssignment.assignedAt,
              isActive: activeAssignment.isActive,
              deliveryPartner: activeAssignment.deliveryPartner
                ? {
                    id: activeAssignment.deliveryPartner.id,
                    phoneNumber: activeAssignment.deliveryPartner.phoneNumber,
                    vehicleType: activeAssignment.deliveryPartner.vehicleType,
                    vehicleNumber: activeAssignment.deliveryPartner.vehicleNumber,
                    isVerified: activeAssignment.deliveryPartner.isVerified,
                    isActive: activeAssignment.deliveryPartner.isActive,
                    user: activeAssignment.deliveryPartner.user
                      ? {
                          id: activeAssignment.deliveryPartner.user.id,
                          name: activeAssignment.deliveryPartner.user.name,
                          email: activeAssignment.deliveryPartner.user.email,
                        }
                      : null,
                  }
                : null,
            }
          : null,
      };
    });
  }

  async getHotelOrderDetails(hotelId: number, orderId: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, hotelId },
      relations: ['user', 'items', 'items.customizations'],
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID ${orderId} not found for this hotel`,
      );
    }

    const items = (order.items || []).map((item) => {
      const customizations = (item.customizations || []).map((c) => ({
        groupName: c.groupName,
        choiceName: c.choiceName,
        additionalPrice: parseFloat(c.additionalPrice.toString()),
      }));

      return {
        id: item.id,
        foodName: item.foodName,
        foodImage: item.foodImage,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        customizationPrice: parseFloat(item.customizationPrice.toString()),
        finalUnitPrice: parseFloat(item.finalUnitPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
        customizations,
      };
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerNote: order.customerNote,
      subtotal: parseFloat(order.subtotal.toString()),
      deliveryFee: parseFloat(order.deliveryFee.toString()),
      taxAmount: parseFloat(order.taxAmount.toString()),
      discountAmount: parseFloat(order.discountAmount.toString()),
      totalAmount: parseFloat(order.totalAmount.toString()),
      placedAt: order.placedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      acceptedAt: order.acceptedAt,
      rejectedAt: order.rejectedAt,
      preparingAt: order.preparingAt,
      readyForPickupAt: order.readyForPickupAt,
      cancelledAt: order.cancelledAt,
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
      user: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email,
          }
        : null,
      items,
    };
  }

  async updateHotelOrderStatus(
    hotelId: number,
    orderId: number,
    nextStatus: string,
  ): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, hotelId },
    });
    if (!order) {
      throw new NotFoundException(
        `Order with ID ${orderId} not found for this hotel`,
      );
    }

    const current = order.orderStatus;
    let isValidTransition = false;

    if (nextStatus === 'cancelled' || nextStatus === 'rejected') {
      if (current !== 'delivered' && current !== 'cancelled' && current !== 'rejected') {
        isValidTransition = true;
      }
    } else if (current === OrderStatus.PLACED) {
      if (nextStatus === 'accepted' || nextStatus === 'rejected') {
        isValidTransition = true;
      }
    } else if (current === 'accepted') {
      if (nextStatus === 'preparing') {
        isValidTransition = true;
      }
    } else if (current === 'preparing') {
      if (nextStatus === 'ready_for_pickup') {
        isValidTransition = true;
      }
    }

    if (!isValidTransition) {
      throw new BadRequestException(
        `Invalid order status transition from ${current} to ${nextStatus}`,
      );
    }

    order.orderStatus = nextStatus;
    const now = new Date();
    if (nextStatus === 'accepted') {
      order.acceptedAt = now;
    } else if (nextStatus === 'rejected') {
      order.rejectedAt = now;
    } else if (nextStatus === 'preparing') {
      order.preparingAt = now;
    } else if (nextStatus === 'ready_for_pickup') {
      order.readyForPickupAt = now;
    } else if (nextStatus === 'out_for_delivery') {
      order.outForDeliveryAt = now;
    } else if (nextStatus === 'delivered') {
      order.deliveredAt = now;
      await this.deliveryPartnersService.releaseRiderForOrder(order.id, 'DELIVERED').catch(err => {
        console.error(`[Release Rider Error] Failed to release rider for order ${order.id}:`, err);
      });
    } else if (nextStatus === 'cancelled') {
      order.cancelledAt = now;
      await this.deliveryPartnersService.releaseRiderForOrder(order.id, 'CANCELLED').catch(err => {
        console.error(`[Release Rider Error] Failed to release rider for order ${order.id}:`, err);
      });
    } else if (nextStatus === 'rejected') {
      order.rejectedAt = now;
      await this.deliveryPartnersService.releaseRiderForOrder(order.id, 'CANCELLED').catch(err => {
        console.error(`[Release Rider Error] Failed to release rider for order ${order.id}:`, err);
      });
    }

    await this.orderRepository.save(order);

    // Notify customer on status update
    if (nextStatus === 'accepted') {
      this.notificationsService.sendCustomerPush(
        order.userId,
        'Restaurant Accepted Order',
        `Your order #${order.orderNumber} has been accepted by the restaurant.`,
        { orderId: order.id, type: 'accepted' }
      );
    } else if (nextStatus === 'preparing') {
      this.notificationsService.sendCustomerPush(
        order.userId,
        'Preparing Food',
        `The restaurant is preparing your food for order #${order.orderNumber}.`,
        { orderId: order.id, type: 'preparing' }
      );
    } else if (nextStatus === 'ready_for_pickup') {
      this.notificationsService.sendCustomerPush(
        order.userId,
        'Ready for Pickup',
        `Your order #${order.orderNumber} is ready for pickup!`,
        { orderId: order.id, type: 'ready_for_pickup' }
      );
    }

    if (nextStatus === 'accepted') {
      this.deliveryPartnersService.triggerDispatchForOrder(order.id).catch(err => {
        console.error(`[Dispatch Error] Failed to dispatch order ${order.id}:`, err);
      });
    }

    return {
      message: `Order status updated to ${nextStatus}`,
      orderId: order.id,
      orderStatus: order.orderStatus,
    };
  }

  async cancelOrder(userId: number, orderId: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const current = order.orderStatus?.toLowerCase();
    if (current === 'out_for_delivery' || current === 'delivered') {
      throw new BadRequestException(
        'Order cannot be cancelled because it is already out for delivery or delivered',
      );
    }
    if (current === 'cancelled' || current === 'rejected') {
      throw new BadRequestException('Order is already cancelled or rejected');
    }

    order.orderStatus = 'cancelled';
    const now = new Date();
    order.cancelledAt = now;

    // Release the rider and inactivate the assignment
    await this.deliveryPartnersService.releaseRiderForOrder(order.id, 'CANCELLED').catch(err => {
      console.error(`[Release Rider Error] Failed to release rider for order ${order.id}:`, err);
    });

    await this.orderRepository.save(order);

    if (order.deliveryPartnerId) {
      this.notificationsService.sendPartnerPush(
        order.deliveryPartnerId,
        'Order Cancelled',
        `Order #${order.orderNumber} has been cancelled.`,
        { orderId: order.id, type: 'order_cancelled' }
      );
    }

    return {
      message: 'Order cancelled successfully',
      orderId: order.id,
      orderStatus: order.orderStatus,
    };
  }

  async findAllForAdmin(): Promise<any[]> {
    const orders = await this.orderRepository.find({
      relations: ['hotel', 'user', 'items'],
      order: { id: 'DESC' },
    });

    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const assignments = await this.dataSource.getRepository('DeliveryAssignment').find({
      where: { orderId: In(orderIds) },
      relations: ['deliveryPartner', 'deliveryPartner.user'],
      order: { id: 'DESC' },
    });

    return orders.map((order) => {
      const activeAssignment = assignments.find((a) => a.orderId === order.id);
      return {
        ...order,
        activeAssignment: activeAssignment
          ? {
              id: activeAssignment.id,
              assignedAt: activeAssignment.assignedAt,
              isActive: activeAssignment.isActive,
              status: activeAssignment.status,
              deliveryPartner: activeAssignment.deliveryPartner
                ? {
                    id: activeAssignment.deliveryPartner.id,
                    phoneNumber: activeAssignment.deliveryPartner.phoneNumber,
                    vehicleType: activeAssignment.deliveryPartner.vehicleType,
                    vehicleNumber: activeAssignment.deliveryPartner.vehicleNumber,
                    isVerified: activeAssignment.deliveryPartner.isVerified,
                    isActive: activeAssignment.deliveryPartner.isActive,
                    user: activeAssignment.deliveryPartner.user
                      ? {
                          id: activeAssignment.deliveryPartner.user.id,
                          name: activeAssignment.deliveryPartner.user.name,
                          email: activeAssignment.deliveryPartner.user.email,
                        }
                      : null,
                  }
                : null,
            }
          : null,
      };
    });
  }

  async getOrderDetailsForAdmin(id: number): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'hotel',
        'user',
        'items',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    const activeAssignment = await this.dataSource.getRepository('DeliveryAssignment').findOne({
      where: { orderId: id },
      relations: ['deliveryPartner', 'deliveryPartner.user'],
      order: { id: 'DESC' },
    });

    return {
      order,
      activeAssignment: activeAssignment
        ? {
            id: activeAssignment.id,
            assignedAt: activeAssignment.assignedAt,
            isActive: activeAssignment.isActive,
            status: activeAssignment.status,
            deliveryPartner: activeAssignment.deliveryPartner
              ? {
                  id: activeAssignment.deliveryPartner.id,
                  phoneNumber: activeAssignment.deliveryPartner.phoneNumber,
                  vehicleType: activeAssignment.deliveryPartner.vehicleType,
                  vehicleNumber: activeAssignment.deliveryPartner.vehicleNumber,
                  isVerified: activeAssignment.deliveryPartner.isVerified,
                  isActive: activeAssignment.deliveryPartner.isActive,
                  user: activeAssignment.deliveryPartner.user
                    ? {
                        id: activeAssignment.deliveryPartner.user.id,
                        name: activeAssignment.deliveryPartner.user.name,
                        email: activeAssignment.deliveryPartner.user.email,
                      }
                    : null,
                }
              : null,
          }
        : null,
    };
  }

  async getOrderPin(userId: number, orderId: number): Promise<{ deliveryPin: string | null }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const allowedStatuses = ['picked_up', 'out_for_delivery', 'delivered'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return { deliveryPin: null };
    }

    if (!order.deliveryPinHash) {
      return { deliveryPin: null };
    }

    const decrypted = decryptPin(order.deliveryPinHash);
    return { deliveryPin: decrypted || null };
  }
}
