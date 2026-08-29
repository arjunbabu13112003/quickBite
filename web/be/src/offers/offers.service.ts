import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In, Not } from 'typeorm';
import { Offer } from './offer.entity';
import { OfferRedemption } from './offer-redemption.entity';
import { Store99Campaign } from './store99-campaign.entity';
import { Store99Item } from './store99-item.entity';
import { HotelCampaignParticipation } from './hotel-campaign-participation.entity';
import { Category } from '../categories/category.entity';
import { Food } from '../foods/food.entity';
import { Hotel } from '../hotels/hotel.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { resolveHotelOfferForFood } from './offer-pricing.helper';
import { Order } from '../orders/order.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OffersService implements OnModuleInit {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(OfferRedemption)
    private readonly redemptionRepository: Repository<OfferRedemption>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
    @InjectRepository(Hotel)
    private readonly hotelRepository: Repository<Hotel>,
    @InjectRepository(Store99Campaign)
    private readonly campaignRepository: Repository<Store99Campaign>,
    @InjectRepository(Store99Item)
    private readonly campaignItemRepository: Repository<Store99Item>,
    @InjectRepository(HotelCampaignParticipation)
    private readonly participationRepository: Repository<HotelCampaignParticipation>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.campaignRepository.count();
      if (count === 0) {
        console.log('Seeding default active ₹99 Store Campaign...');
        const campaign = this.campaignRepository.create({
          name: 'Monsoon ₹99 Mega Deal',
          description: 'Enjoy delicious food items from top restaurants at just ₹99!',
          bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
          price: 99.00,
          startAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
          endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Ends in 14 days
          isActive: true
        });
        await this.campaignRepository.save(campaign);
      }
    } catch (e) {
      console.error('Error auto-seeding ₹99 campaign:', e);
    }
  }

  async createOffer(hotelId: number | null, dto: CreateOfferDto): Promise<Offer> {
    // 1. Verify hotel exists
    if (hotelId !== null) {
      const hotel = await this.hotelRepository.findOne({ where: { id: hotelId } });
      if (!hotel) {
        throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
      }
    }

    // 2. Check unique code per hotel
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.offerRepository.findOne({
      where: { code: normalizedCode, hotelId: hotelId ?? null },
    });
    if (existing) {
      throw new ConflictException(`Promo code "${normalizedCode}" already exists.`);
    }

    // 3. Validate dates
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (end <= start) {
      throw new BadRequestException('End date must be after start date.');
    }

    // 4. Resolve relations
    let applicableCategories: Category[] = [];
    if (dto.applicabilityType === 'categories' && dto.applicableCategoryIds) {
      applicableCategories = await this.categoryRepository.findByIds(dto.applicableCategoryIds);
      if (applicableCategories.length === 0) {
        throw new BadRequestException('At least one valid category must be selected.');
      }
    }

    let applicableFoods: Food[] = [];
    if (dto.applicabilityType === 'foods' && dto.applicableFoodIds) {
      applicableFoods = await this.foodRepository.findByIds(dto.applicableFoodIds);
      if (applicableFoods.length === 0) {
        throw new BadRequestException('At least one valid menu item must be selected.');
      }
    }

    // 5. Create
    const offer = this.offerRepository.create({
      ...dto,
      code: normalizedCode,
      hotelId,
      applicableCategories,
      applicableFoods,
      startAt: start,
      endAt: end,
    });

    // Validate flat discount >= food price for applicable foods
    if (offer.discountType === 'flat' && offer.applicabilityType === 'foods') {
      for (const food of offer.applicableFoods) {
        if (Number(offer.discountValue) >= Number(food.price)) {
          throw new BadRequestException('Flat discount must be less than the eligible food price.');
        }
      }
    }

    const saved = await this.offerRepository.save(offer);
    if (this.isValidForBroadcast(saved)) {
      this.broadcastOfferNotification(saved).catch(err => {
        console.error('[OffersService] Failed to broadcast new offer notification:', err);
      });
    }
    return saved;
  }

  async updateOffer(id: number, hotelId: number | null, dto: UpdateOfferDto): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id, hotelId: hotelId ?? null },
      relations: ['applicableCategories', 'applicableFoods'],
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (dto.code) {
      const normalizedCode = dto.code.trim().toUpperCase();
      const existing = await this.offerRepository.findOne({
        where: { code: normalizedCode, hotelId: hotelId ?? null },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Promo code "${normalizedCode}" is already in use by another campaign.`);
      }
      offer.code = normalizedCode;
    }

    if (dto.startAt || dto.endAt) {
      const start = dto.startAt ? new Date(dto.startAt) : offer.startAt;
      const end = dto.endAt ? new Date(dto.endAt) : offer.endAt;
      if (end <= start) {
        throw new BadRequestException('End date must be after start date.');
      }
      offer.startAt = start;
      offer.endAt = end;
    }

    if (dto.applicabilityType !== undefined) {
      offer.applicabilityType = dto.applicabilityType;
    }

    if (offer.applicabilityType === 'categories') {
      if (dto.applicableCategoryIds !== undefined) {
        offer.applicableCategories = await this.categoryRepository.findByIds(dto.applicableCategoryIds);
      }
      offer.applicableFoods = [];
    } else if (offer.applicabilityType === 'foods') {
      if (dto.applicableFoodIds !== undefined) {
        offer.applicableFoods = await this.foodRepository.findByIds(dto.applicableFoodIds);
      }
      offer.applicableCategories = [];
    } else if (offer.applicabilityType === 'all') {
      offer.applicableCategories = [];
      offer.applicableFoods = [];
    }

    const wasActiveAndValid = this.isValidForBroadcast(offer);

    // Merge other fields
    const { code, startAt, endAt, applicableCategoryIds, applicableFoodIds, ...rest } = dto;
    Object.assign(offer, rest);

    // Validate flat discount >= food price for applicable foods
    if (offer.discountType === 'flat' && offer.applicableFoods && offer.applicableFoods.length > 0) {
      for (const food of offer.applicableFoods) {
        if (Number(offer.discountValue) >= Number(food.price)) {
          throw new BadRequestException('Flat discount must be less than the eligible food price.');
        }
      }
    }

    const saved = await this.offerRepository.save(offer);
    const isActiveAndValidNow = this.isValidForBroadcast(saved);
    if (!wasActiveAndValid && isActiveAndValidNow) {
      this.broadcastOfferNotification(saved).catch(err => {
        console.error('[OffersService] Failed to broadcast updated offer notification:', err);
      });
    }

    return saved;
  }

  async deleteOffer(id: number, hotelId: number | null): Promise<any> {
    const offer = await this.offerRepository.findOne({ where: { id, hotelId: hotelId ?? null } });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Safely delete - CASCADE is configured on redemptions
    await this.offerRepository.remove(offer);
    return { success: true, message: 'Offer deleted successfully' };
  }

  async getOffersForHotel(hotelId: number | null): Promise<Offer[]> {
    return await this.offerRepository.find({
      where: { hotelId: hotelId ?? null },
      relations: ['applicableCategories', 'applicableFoods'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOfferById(id: number, hotelId: number | null): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id, hotelId: hotelId ?? null },
      relations: ['applicableCategories', 'applicableFoods'],
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return offer;
  }

  async duplicateOffer(id: number, hotelId: number | null): Promise<Offer> {
    const original = await this.offerRepository.findOne({
      where: { id, hotelId: hotelId ?? null },
      relations: ['applicableCategories', 'applicableFoods'],
    });
    if (!original) {
      throw new NotFoundException('Original offer not found');
    }

    // Generate unique code suffix
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newCode = `${original.code.substring(0, 15)}_DUP_${randomSuffix}`;

    const duplicate = this.offerRepository.create({
      ...original,
      id: undefined,
      code: newCode,
      name: `${original.name} (Copy)`,
      redemptionCount: 0,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return await this.offerRepository.save(duplicate);
  }

  /**
   * Internal verification validation engine.
   * Scans dates, active flags, order limits, customer limits, and menu item exclusions.
   */
  async validateOfferInternal(
    code: string,
    hotelId: number,
    userId: number,
    items: Array<{ foodId: number; categoryId?: number; quantity: number; finalUnitPrice: number }>,
    subtotal: number,
    deliveryFee: number,
  ): Promise<{ isValid: boolean; message?: string; offer?: Offer; discountAmount: number; finalDeliveryFee: number }> {
    const offer = await this.offerRepository.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.applicableCategories', 'category')
      .leftJoinAndSelect('offer.applicableFoods', 'food')
      .where('offer.code = :code', { code: code.trim().toUpperCase() })
      .andWhere('(offer.hotelId = :hotelId OR offer.hotelId IS NULL)', { hotelId })
      .getOne();

    if (!offer) {
      return { isValid: false, message: '❌ Invalid Promo Code.', discountAmount: 0, finalDeliveryFee: deliveryFee };
    }

    if (!offer.isActive) {
      return { isValid: false, message: '❌ This coupon is currently inactive.', discountAmount: 0, finalDeliveryFee: deliveryFee };
    }

    const now = new Date();
    if (now < offer.startAt) {
      return { isValid: false, message: '❌ Offer has not started yet.', discountAmount: 0, finalDeliveryFee: deliveryFee };
    }
    if (now > offer.endAt) {
      return { isValid: false, message: '❌ Coupon has expired.', discountAmount: 0, finalDeliveryFee: deliveryFee };
    }

    if (offer.totalUsageLimit !== null && offer.totalUsageLimit !== undefined) {
      if (offer.redemptionCount >= offer.totalUsageLimit) {
        return { isValid: false, message: '❌ Offer redemption limit reached.', discountAmount: 0, finalDeliveryFee: deliveryFee };
      }
    }

    // Validate Customer usage limit
    const userRedemptions = await this.redemptionRepository.count({
      where: { offerId: offer.id, customerId: userId },
    });
    if (offer.usagePerCustomer !== null && offer.usagePerCustomer !== undefined) {
      if (userRedemptions >= offer.usagePerCustomer) {
        return { isValid: false, message: '❌ You have already redeemed this promo code.', discountAmount: 0, finalDeliveryFee: deliveryFee };
      }
    }

    // Applicability filters
    let eligibleSubtotal = 0;
    if (offer.applicabilityType === 'all') {
      eligibleSubtotal = subtotal;
    } else if (offer.applicabilityType === 'categories') {
      const allowedCatIds = offer.applicableCategories.map((c) => c.id);
      const eligibleItems = items.filter((item) => allowedCatIds.includes(item.categoryId));
      eligibleSubtotal = eligibleItems.reduce((acc, i) => acc + i.finalUnitPrice * i.quantity, 0);
    } else if (offer.applicabilityType === 'foods') {
      const allowedFoodIds = offer.applicableFoods.map((f) => f.id);
      const eligibleItems = items.filter((item) => allowedFoodIds.includes(item.foodId));
      eligibleSubtotal = eligibleItems.reduce((acc, i) => acc + i.finalUnitPrice * i.quantity, 0);
    }

    if (eligibleSubtotal <= 0) {
      return { isValid: false, message: '❌ Cart items are not eligible for this promotion.', discountAmount: 0, finalDeliveryFee: deliveryFee };
    }

    if (eligibleSubtotal < Number(offer.minimumOrderValue)) {
      return {
        isValid: false,
        message: `❌ Minimum eligible subtotal of Rs. ${offer.minimumOrderValue} required.`,
        discountAmount: 0,
        finalDeliveryFee: deliveryFee,
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    let finalDeliveryFee = deliveryFee;

    if (offer.discountType === 'percentage') {
      discountAmount = (eligibleSubtotal * Number(offer.discountValue)) / 100;
      if (offer.maxDiscount && discountAmount > Number(offer.maxDiscount)) {
        discountAmount = Number(offer.maxDiscount);
      }
    } else if (offer.discountType === 'flat') {
      discountAmount = Math.min(Number(offer.discountValue), eligibleSubtotal);
    } else if (offer.discountType === 'free_delivery') {
      discountAmount = 0;
      finalDeliveryFee = 0;
    }

    return {
      isValid: true,
      offer,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalDeliveryFee,
    };
  }

  /**
   * Idempotent redemption transaction hook.
   * Atomically locks the Offer row, increments count, and persists redemption logs.
   */
  async recordRedemption(orderId: number, manager: EntityManager): Promise<void> {
    const order = await manager.findOne(Order, { where: { id: orderId } });
    if (!order || !order.couponCode) return;

    // Idempotency check
    const existing = await manager.findOne(OfferRedemption, {
      where: { orderId: order.id },
    });
    if (existing) return;

    // pessimistic lock to prevent concurrent double-booking of counts
    const offer = await manager.createQueryBuilder(Offer, 'offer')
      .setLock('pessimistic_write')
      .where('offer.code = :code', { code: order.couponCode })
      .andWhere('(offer.hotelId = :hotelId OR offer.hotelId IS NULL)', { hotelId: order.hotelId })
      .getOne();

    if (!offer) return;

    // Increment
    offer.redemptionCount += 1;
    await manager.save(Offer, offer);

    // Save logs
    const redemption = manager.create(OfferRedemption, {
      offerId: offer.id,
      customerId: order.userId,
      orderId: order.id,
      discountAmount: order.discountAmount,
      redeemedAt: new Date(),
    });
    await manager.save(OfferRedemption, redemption);
  }

  async getOffersForCustomer(hotelId: number, now: Date): Promise<Offer[]> {
    return await this.offerRepository.createQueryBuilder('offer')
      .where('(offer.hotelId = :hotelId OR offer.hotelId IS NULL)', { hotelId })
      .andWhere('offer.isActive = true')
      .andWhere('offer.startAt <= :now', { now })
      .andWhere('offer.endAt >= :now', { now })
      .orderBy('offer.createdAt', 'DESC')
      .getMany();
  }

  // ─── 99 Store Campaign Service Methods ───

  async getActiveCampaign(): Promise<Store99Campaign | null> {
    const now = new Date();
    return await this.campaignRepository.createQueryBuilder('campaign')
      .where('campaign.isActive = true')
      .andWhere('campaign.endAt >= :now', { now })
      .orderBy('campaign.startAt', 'ASC')
      .getOne();
  }

  async getActiveCampaigns(): Promise<Store99Campaign[]> {
    const now = new Date();
    return await this.campaignRepository.createQueryBuilder('campaign')
      .where('campaign.isActive = true')
      .andWhere('campaign.endAt >= :now', { now })
      .orderBy('campaign.startAt', 'ASC')
      .getMany();
  }

  async checkHotelParticipating(campaignId: number, hotelId: number): Promise<boolean> {
    const count = await this.campaignItemRepository.count({
      where: { campaignId, hotelId }
    });
    return count > 0;
  }

  async joinCampaign(campaignId: number, hotelId: number): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    // 1. Update participation status to participating
    const participation = await this.participationRepository.findOne({
      where: { campaignId, hotelId }
    });
    if (participation) {
      participation.status = 'participating';
      await this.participationRepository.save(participation);
    }

    // 2. Create placeholder approved item if not already exists
    const existing = await this.campaignItemRepository.findOne({
      where: { campaignId, hotelId }
    });

    if (!existing) {
      const item = this.campaignItemRepository.create({
        campaignId,
        hotelId,
        foodId: -1,
        status: 'approved'
      });
      await this.campaignItemRepository.save(item);
    }
  }

  async getCampaignItems(campaignId: number, hotelId: number): Promise<Store99Item[]> {
    const items = await this.campaignItemRepository.find({
      where: { campaignId, hotelId }
    });
    return items.filter(item => item.foodId !== -1);
  }

  async submitCampaignItems(campaignId: number, hotelId: number, foodIds: number[]): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    // Safety validation: Verify all selected foodIds belong to this hotel!
    if (foodIds.length > 0) {
      const foods = await this.foodRepository.findByIds(foodIds);
      const invalidFood = foods.find(f => f.hotelId !== hotelId);
      if (invalidFood || foods.length !== foodIds.length) {
        throw new BadRequestException(`One or more selected food items do not belong to this hotel`);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // Update participation status
      const participation = await manager.findOne(HotelCampaignParticipation, {
        where: { campaignId, hotelId }
      });
      if (participation && participation.status !== 'participating') {
        participation.status = 'participating';
        await manager.save(HotelCampaignParticipation, participation);
      }

      await manager.delete(Store99Item, { campaignId, hotelId });

      if (foodIds.length === 0) {
        const item = manager.create(Store99Item, {
          campaignId,
          hotelId,
          foodId: -1,
          status: 'approved'
        });
        await manager.save(Store99Item, item);
      } else {
        for (const foodId of foodIds) {
          const item = manager.create(Store99Item, {
            campaignId,
            hotelId,
            foodId,
            status: 'approved'
          });
          await manager.save(Store99Item, item);
        }
      }
    });
  }

  // ─── Hotel Admin Campaign Participation Methods ───

  async getHotelCampaigns(hotelId: number): Promise<any[]> {
    const participations = await this.participationRepository.find({
      where: { hotelId },
      order: { createdAt: 'DESC' }
    });

    const result = [];
    for (const p of participations) {
      const campaign = await this.campaignRepository.findOne({ where: { id: p.campaignId } });
      if (campaign && campaign.isActive) {
        result.push({
          ...campaign,
          participationStatus: p.status, // 'invited' | 'participating' | 'declined' | 'ended'
          isParticipating: p.status === 'participating',
        });
      }
    }
    return result;
  }

  async getPublicCampaignDetails(campaignId: number): Promise<any> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId, isActive: true }
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found or inactive`);
    }

    const now = new Date();
    if (now < campaign.startAt || now > campaign.endAt) {
      return {
        ...campaign,
        isExpired: true,
        participatingHotels: [],
        items: []
      };
    }

    // Find participating hotels
    const participations = await this.participationRepository.find({
      where: { campaignId: campaign.id, status: 'participating' }
    });

    const participatingHotels = [];
    const campaignItems = [];

    for (const p of participations) {
      const selectedItems = await this.campaignItemRepository.find({
        where: { campaignId: campaign.id, hotelId: p.hotelId }
      });

      const validItems = selectedItems.filter(item => item.foodId !== -1);

      const hotel = await this.hotelRepository.findOne({ where: { id: p.hotelId } });
      if (!hotel) {
        continue;
      }

      participatingHotels.push({
        id: hotel.id,
        name: hotel.name,
        image: hotel.image,
        rating: 4.8,
        deliveryTime: `${hotel.deliveryTimeMin || 20}-${hotel.deliveryTimeMax || 35} min`,
      });

      for (const validItem of validItems) {
        const food = await this.foodRepository.findOne({
          where: { id: validItem.foodId },
          relations: ['category']
        });
        if (!food || !food.isActive || !food.isAvailable) {
          continue;
        }

        const campaignPrice = this.calculateCampaignDiscountedPrice(food.price, campaign);
        let dynamicOfferPrice = campaignPrice;
        let appliedOfferId = null;
        let appliedOfferLabel = null;

        const hotelOffer = await resolveHotelOfferForFood(this.dataSource, food, now);
        if (hotelOffer.offerId !== null) {
          if (hotelOffer.offerPrice !== null && hotelOffer.offerPrice < campaignPrice) {
            dynamicOfferPrice = hotelOffer.offerPrice;
            appliedOfferId = hotelOffer.offerId;
            appliedOfferLabel = hotelOffer.offerLabel;
          } else {
            appliedOfferId = hotelOffer.offerId;
            appliedOfferLabel = hotelOffer.offerLabel;
          }
        }

        campaignItems.push({
          id: food.id,
          itemId: food.id,
          name: food.name,
          price: food.price,
          offerPrice: dynamicOfferPrice,
          originalPrice: food.price,
          image: food.image,
          isVeg: food.isVeg,
          categoryId: food.categoryId,
          categoryName: food.category?.name || 'Specials',
          hotelId: hotel.id,
          hotelName: hotel.name,
          is99StoreItem: true,
          campaignId: campaign.id,
          offerId: appliedOfferId,
          offerLabel: appliedOfferLabel,
        });
      }
    }

    return {
      ...campaign,
      isExpired: false,
      participatingHotels,
      items: campaignItems
    };
  }

  async getAllActiveOffers(): Promise<{ offers: Offer[], hotels: Hotel[], foods: any[] }> {
    const now = new Date();
    
    // 1. Get all active hotel-specific offers
    const activeOffers = await this.offerRepository.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.hotel', 'hotel')
      .leftJoinAndSelect('offer.applicableCategories', 'category')
      .leftJoinAndSelect('offer.applicableFoods', 'food')
      .where('offer.isActive = true')
      .andWhere('offer.hotelId IS NOT NULL')
      .andWhere('offer.startAt <= :now', { now })
      .andWhere('offer.endAt >= :now', { now })
      .orderBy('offer.createdAt', 'DESC')
      .getMany();

    // 2. Extract unique hotels
    const hotelsMap = new Map<number, Hotel>();
    activeOffers.forEach(o => {
      if (o.hotel) {
        hotelsMap.set(o.hotel.id, o.hotel);
      }
    });
    const hotels = Array.from(hotelsMap.values());

    // 3. Extract foods with active offers (applicabilityType = 'foods' or 'all')
    const foodsList = [];
    for (const offer of activeOffers) {
      if (offer.applicabilityType === 'foods' && offer.applicableFoods && offer.applicableFoods.length > 0) {
        for (const food of offer.applicableFoods) {
          const detailedFood = await this.foodRepository.findOne({
            where: { id: food.id },
            relations: ['category', 'hotel']
          });
          if (detailedFood && detailedFood.isActive && detailedFood.isAvailable) {
            let offerPrice = Number(detailedFood.price);
            if (offer.discountType === 'percentage') {
              const disc = (offerPrice * Number(offer.discountValue)) / 100;
              offerPrice = Math.max(0, offerPrice - (offer.maxDiscount ? Math.min(disc, Number(offer.maxDiscount)) : disc));
            } else if (offer.discountType === 'flat') {
              offerPrice = Math.max(0, offerPrice - Number(offer.discountValue));
            }

            foodsList.push({
              id: detailedFood.id,
              itemId: detailedFood.id,
              name: detailedFood.name,
              price: detailedFood.price,
              offerPrice: parseFloat(offerPrice.toFixed(2)),
              originalPrice: detailedFood.price,
              image: detailedFood.image,
              isVeg: detailedFood.isVeg,
              categoryName: detailedFood.category?.name || 'Specials',
              hotelId: offer.hotelId,
              hotelName: offer.hotel?.name || 'QuickBite',
              offerLabel: offer.discountType === 'percentage'
                ? `${Math.round(offer.discountValue)}% OFF`
                : offer.discountType === 'flat'
                  ? `₹${Math.round(offer.discountValue)} OFF`
                  : 'FREE DELIVERY',
              offerId: offer.id,
              offerName: offer.name,
              discountType: offer.discountType,
            });
          }
        }
      } else if (offer.applicabilityType === 'all') {
        const bestSeller = await this.foodRepository.findOne({
          where: { hotelId: offer.hotelId, isActive: true, isAvailable: true },
          relations: ['category', 'hotel']
        });
        if (bestSeller) {
          let offerPrice = Number(bestSeller.price);
          if (offer.discountType === 'percentage') {
            const disc = (offerPrice * Number(offer.discountValue)) / 100;
            offerPrice = Math.max(0, offerPrice - (offer.maxDiscount ? Math.min(disc, Number(offer.maxDiscount)) : disc));
          } else if (offer.discountType === 'flat') {
            offerPrice = Math.max(0, offerPrice - Number(offer.discountValue));
          }
          foodsList.push({
            id: bestSeller.id,
            itemId: bestSeller.id,
            name: bestSeller.name,
            price: bestSeller.price,
            offerPrice: parseFloat(offerPrice.toFixed(2)),
            originalPrice: bestSeller.price,
            image: bestSeller.image,
            isVeg: bestSeller.isVeg,
            categoryName: bestSeller.category?.name || 'Specials',
            hotelId: offer.hotelId,
            hotelName: offer.hotel?.name || 'QuickBite',
            offerLabel: offer.discountType === 'percentage'
              ? `${Math.round(offer.discountValue)}% OFF`
              : offer.discountType === 'flat'
                ? `₹${Math.round(offer.discountValue)} OFF`
                : 'FREE DELIVERY',
            offerId: offer.id,
            offerName: offer.name,
            discountType: offer.discountType,
          });
        }
      }
    }

    return {
      offers: activeOffers,
      hotels,
      foods: foodsList
    };
  }

  async getPublicCampaigns(): Promise<any[]> {
    const now = new Date();
    // 1. Get all active campaigns
    const campaigns = await this.campaignRepository.createQueryBuilder('campaign')
      .where('campaign.isActive = true')
      .andWhere('campaign.startAt <= :now', { now })
      .andWhere('campaign.endAt >= :now', { now })
      .orderBy('campaign.createdAt', 'DESC')
      .getMany();

    const result = [];

    for (const campaign of campaigns) {
      // 2. Find participating participations for this campaign
      const participations = await this.participationRepository.find({
        where: { campaignId: campaign.id, status: 'participating' }
      });

      const participatingHotels = [];
      const campaignItems = [];

      for (const p of participations) {
        // Find selected items for this hotel in this campaign
        const selectedItems = await this.campaignItemRepository.find({
          where: { campaignId: campaign.id, hotelId: p.hotelId }
        });

        // Filter out placeholders
        const validItems = selectedItems.filter(item => item.foodId !== -1);

        // Get hotel details
        const hotel = await this.hotelRepository.findOne({ where: { id: p.hotelId } });
        if (!hotel) {
          continue;
        }

        participatingHotels.push({
          id: hotel.id,
          name: hotel.name,
          image: hotel.image,
          rating: 4.8,
          deliveryTime: `${hotel.deliveryTimeMin || 20}-${hotel.deliveryTimeMax || 35} min`,
        });

        // Get food items details
        for (const validItem of validItems) {
          const food = await this.foodRepository.findOne({
            where: { id: validItem.foodId },
            relations: ['category']
          });
          if (!food || !food.isActive || !food.isAvailable) {
            continue;
          }

          // Calculate dynamic offer price for this food based on this campaign
          const offerPrice = this.calculateCampaignDiscountedPrice(food.price, campaign);

          campaignItems.push({
            id: food.id,
            itemId: food.id,
            name: food.name,
            price: food.price,
            offerPrice: offerPrice,
            originalPrice: food.price,
            image: food.image,
            isVeg: food.isVeg,
            categoryId: food.categoryId,
            categoryName: food.category?.name || 'Specials',
            hotelId: hotel.id,
            hotelName: hotel.name,
            is99StoreItem: true,
          });
        }
      }

      // Always include active campaigns
      result.push({
        ...campaign,
        participatingHotels,
        items: campaignItems
      });
    }

    return result;
  }

  calculateCampaignDiscountedPrice(originalPrice: number, campaign: Store99Campaign): number {
    const orig = Number(originalPrice) || 0;
    const type = campaign.offerType || 'FIXED_PRICE';
    if (type === 'FIXED_PRICE') {
      return Number(campaign.price) || 0;
    }
    if (type === 'FLAT_DISCOUNT') {
      return Math.max(0, orig - (Number(campaign.flatDiscountAmount) || 0));
    }
    if (type === 'PERCENTAGE_DISCOUNT') {
      let disc = orig * (Number(campaign.percentageDiscount) || 0) / 100;
      if (campaign.maxDiscount) {
        disc = Math.min(disc, Number(campaign.maxDiscount));
      }
      return Math.max(0, orig - disc);
    }
    return orig;
  }

  async participateInCampaign(campaignId: number, hotelId: number, foodIds: number[]): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const participation = await this.participationRepository.findOne({
      where: { campaignId, hotelId }
    });
    if (!participation) {
      throw new ForbiddenException(`Hotel is not invited to this campaign`);
    }

    // Backend validation: Verify all foodIds belong to this hotel!
    if (foodIds.length > 0) {
      const foods = await this.foodRepository.findByIds(foodIds);
      const invalidFood = foods.find(f => f.hotelId !== hotelId);
      if (invalidFood || foods.length !== foodIds.length) {
        throw new BadRequestException(`One or more selected food items do not belong to this hotel`);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Update participation status
      participation.status = 'participating';
      await manager.save(HotelCampaignParticipation, participation);

      // 2. Clear old items
      await manager.delete(Store99Item, { campaignId, hotelId });

      // 3. Save new items
      for (const foodId of foodIds) {
        const item = manager.create(Store99Item, {
          campaignId,
          hotelId,
          foodId,
          status: 'approved'
        });
        await manager.save(Store99Item, item);
      }
    });
  }

  async declineCampaign(campaignId: number, hotelId: number): Promise<void> {
    const participation = await this.participationRepository.findOne({
      where: { campaignId, hotelId }
    });
    if (!participation) {
      throw new ForbiddenException(`Hotel is not invited to this campaign`);
    }

    participation.status = 'declined';
    await this.participationRepository.save(participation);

    // Also delete any selected food items if they previously had any
    await this.campaignItemRepository.delete({ campaignId, hotelId });
  }

  // ─── Super Admin Campaign Management Methods ───

  async getAllCampaigns(): Promise<any[]> {
    const campaigns = await this.campaignRepository.find({
      order: { createdAt: 'DESC' }
    });

    const result = [];
    for (const campaign of campaigns) {
      const participations = await this.participationRepository.find({
        where: { campaignId: campaign.id }
      });
      const items = await this.campaignItemRepository.find({
        where: { campaignId: campaign.id }
      });

      const participatingCount = participations.filter(p => p.status === 'participating').length;
      const foodIds = items.filter(item => item.foodId !== -1).map(item => item.foodId);

      result.push({
        ...campaign,
        hotelCount: participations.length, // Total invited
        participatingCount, // Actual participating
        foodCount: foodIds.length
      });
    }
    return result;
  }

  async getCampaignById(id: number): Promise<any> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    const participations = await this.participationRepository.find({
      where: { campaignId: id }
    });

    const items = await this.campaignItemRepository.find({
      where: { campaignId: id }
    });

    const invitedHotels = [];
    for (const p of participations) {
      const hotel = await this.hotelRepository.findOne({ where: { id: p.hotelId } });
      if (hotel) {
        invitedHotels.push({
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          logo: hotel.logo,
          status: p.status // 'invited' | 'participating' | 'declined' | 'ended'
        });
      }
    }

    const hotelIds = participations.map(p => p.hotelId);
    const foodIds = items.filter(item => item.foodId !== -1).map(item => item.foodId);

    return {
      ...campaign,
      hotelIds,
      foodIds,
      invitedHotels
    };
  }

  async createCampaign(dto: {
    name: string;
    description?: string;
    bannerUrl?: string;
    price?: number;
    startAt: Date;
    endAt: Date;
    hotelIds?: number[];
    isActive?: boolean;
    offerType?: string;
    flatDiscountAmount?: number;
    percentageDiscount?: number;
    maxDiscount?: number;
    minimumOrder?: number;
    maxDeliveryFee?: number;
    deliveryRadius?: number;
    appliesTo?: string;
  }): Promise<Store99Campaign> {
    const campaign = this.campaignRepository.create({
      name: dto.name,
      description: dto.description,
      bannerUrl: dto.bannerUrl,
      price: dto.price || 0,
      offerType: dto.offerType || 'FIXED_PRICE',
      flatDiscountAmount: dto.flatDiscountAmount,
      percentageDiscount: dto.percentageDiscount,
      maxDiscount: dto.maxDiscount,
      minimumOrder: dto.minimumOrder,
      maxDeliveryFee: dto.maxDeliveryFee,
      deliveryRadius: dto.deliveryRadius,
      appliesTo: dto.appliesTo || 'items',
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      isActive: dto.isActive !== undefined ? dto.isActive : true
    });

    const saved = await this.campaignRepository.save(campaign);
    await this.saveCampaignInvitations(saved.id, dto.hotelIds || []);
    if (this.isValidForBroadcast(saved)) {
      this.broadcastCampaignNotification(saved).catch(err => {
        console.error('[OffersService] Failed to broadcast new campaign notification:', err);
      });
    }
    return saved;
  }

  async updateCampaign(id: number, dto: {
    name?: string;
    description?: string;
    bannerUrl?: string;
    price?: number;
    startAt?: Date;
    endAt?: Date;
    hotelIds?: number[];
    isActive?: boolean;
    offerType?: string;
    flatDiscountAmount?: number;
    percentageDiscount?: number;
    maxDiscount?: number;
    minimumOrder?: number;
    maxDeliveryFee?: number;
    deliveryRadius?: number;
    appliesTo?: string;
  }): Promise<Store99Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.bannerUrl !== undefined) campaign.bannerUrl = dto.bannerUrl;
    if (dto.price !== undefined) campaign.price = dto.price;
    if (dto.offerType !== undefined) campaign.offerType = dto.offerType;
    if (dto.flatDiscountAmount !== undefined) campaign.flatDiscountAmount = dto.flatDiscountAmount;
    if (dto.percentageDiscount !== undefined) campaign.percentageDiscount = dto.percentageDiscount;
    if (dto.maxDiscount !== undefined) campaign.maxDiscount = dto.maxDiscount;
    if (dto.minimumOrder !== undefined) campaign.minimumOrder = dto.minimumOrder;
    if (dto.maxDeliveryFee !== undefined) campaign.maxDeliveryFee = dto.maxDeliveryFee;
    if (dto.deliveryRadius !== undefined) campaign.deliveryRadius = dto.deliveryRadius;
    if (dto.appliesTo !== undefined) campaign.appliesTo = dto.appliesTo;
    if (dto.startAt !== undefined) campaign.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) campaign.endAt = new Date(dto.endAt);
    if (dto.isActive !== undefined) campaign.isActive = dto.isActive;

    const wasActiveAndValid = this.isValidForBroadcast(campaign);
    const saved = await this.campaignRepository.save(campaign);

    if (dto.hotelIds !== undefined) {
      await this.saveCampaignInvitations(id, dto.hotelIds);
    }

    const isActiveAndValidNow = this.isValidForBroadcast(saved);
    if (!wasActiveAndValid && isActiveAndValidNow) {
      this.broadcastCampaignNotification(saved).catch(err => {
        console.error('[OffersService] Failed to broadcast updated campaign notification:', err);
      });
    }

    return saved;
  }

  async deleteCampaign(id: number): Promise<void> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Store99Item, { campaignId: id });
      await manager.delete(HotelCampaignParticipation, { campaignId: id });
      await manager.delete(Store99Campaign, { id });
    });
  }

  async toggleCampaignActive(id: number): Promise<Store99Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    const wasActiveAndValid = this.isValidForBroadcast(campaign);
    campaign.isActive = !campaign.isActive;
    const saved = await this.campaignRepository.save(campaign);

    const isActiveAndValidNow = this.isValidForBroadcast(saved);
    if (!wasActiveAndValid && isActiveAndValidNow) {
      this.broadcastCampaignNotification(saved).catch(err => {
        console.error('[OffersService] Failed to broadcast toggled campaign notification:', err);
      });
    }

    return saved;
  }

  private async saveCampaignInvitations(campaignId: number, hotelIds: number[]) {
    await this.dataSource.transaction(async (manager) => {
      if (hotelIds.length === 0) {
        await manager.delete(HotelCampaignParticipation, { campaignId });
        await manager.delete(Store99Item, { campaignId });
      } else {
        await manager.createQueryBuilder()
          .delete()
          .from(HotelCampaignParticipation)
          .where('campaignId = :campaignId', { campaignId })
          .andWhere('hotelId NOT IN (:...hotelIds)', { hotelIds })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(Store99Item)
          .where('campaignId = :campaignId', { campaignId })
          .andWhere('hotelId NOT IN (:...hotelIds)', { hotelIds })
          .execute();

        for (const hotelId of hotelIds) {
          const existing = await manager.findOne(HotelCampaignParticipation, {
            where: { campaignId, hotelId }
          });
          if (!existing) {
            const p = manager.create(HotelCampaignParticipation, {
              campaignId,
              hotelId,
              status: 'invited'
            });
            await manager.save(HotelCampaignParticipation, p);
          }
        }
      }
    });
  }

  private isValidForBroadcast(entity: { isActive: boolean; startAt?: Date; endAt?: Date }): boolean {
    if (!entity.isActive) return false;
    const now = new Date();
    if (entity.startAt && new Date(entity.startAt) > now) return false;
    if (entity.endAt && new Date(entity.endAt) < now) return false;
    return true;
  }

  private generateOfferBody(offer: Offer): string {
    let body = '';
    if (offer.discountType === 'percentage') {
      body = `Get ${offer.discountValue}% OFF`;
      if (offer.maxDiscount) {
        body += ` up to ₹${offer.maxDiscount}`;
      }
    } else if (offer.discountType === 'flat') {
      body = `Get ₹${offer.discountValue} OFF`;
    } else if (offer.discountType === 'free_delivery') {
      body = `Enjoy free delivery`;
    } else {
      return 'A new QuickBite offer is now available.';
    }

    if (offer.minimumOrderValue && Number(offer.minimumOrderValue) > 0) {
      body += ` on orders above ₹${offer.minimumOrderValue}`;
    } else {
      body += ` on eligible orders`;
    }

    if (offer.code) {
      body += `. Use code: ${offer.code}`;
    }

    return body + '.';
  }

  private generateCampaignBody(campaign: Store99Campaign): string {
    if (campaign.description && campaign.description.trim() !== '') {
      return campaign.description.trim();
    }

    let body = '';
    if (campaign.offerType === 'FIXED_PRICE') {
      body = `Enjoy delicious items at a fixed price of ₹${campaign.price}`;
    } else if (campaign.offerType === 'FLAT_DISCOUNT' && campaign.flatDiscountAmount) {
      body = `Get a flat ₹${campaign.flatDiscountAmount} discount`;
    } else if (campaign.offerType === 'PERCENTAGE_DISCOUNT' && campaign.percentageDiscount) {
      body = `Get a ${campaign.percentageDiscount}% discount`;
      if (campaign.maxDiscount) {
        body += ` up to ₹${campaign.maxDiscount}`;
      }
    } else if (campaign.offerType === 'FREE_DELIVERY') {
      body = `Get free delivery on your orders`;
    } else {
      return 'A new QuickBite platform campaign is now active!';
    }

    if (campaign.minimumOrder) {
      body += ` on orders above ₹${campaign.minimumOrder}`;
    } else {
      body += ` on eligible orders`;
    }

    return body + '!';
  }

  private async broadcastOfferNotification(offer: Offer) {
    try {
      const title = '🎉 New QuickBite Offer!';
      const body = this.generateOfferBody(offer);
      const data = {
        type: 'offer',
        offerId: String(offer.id),
        hotelId: offer.hotelId ? String(offer.hotelId) : null,
      };
      
      this.notificationsService.broadcastCustomerPush(title, body, data).catch(err => {
        console.error(`[OffersService] Failed to broadcast customer push for Offer #${offer.id}:`, err);
      });
    } catch (err) {
      console.error(`[OffersService] Error preparing push for Offer #${offer.id}:`, err);
    }
  }

  private async broadcastCampaignNotification(campaign: Store99Campaign) {
    try {
      const title = `🔥 ${campaign.name}`;
      const body = this.generateCampaignBody(campaign);
      const data = {
        type: 'campaign',
        campaignId: String(campaign.id),
      };
      
      this.notificationsService.broadcastCustomerPush(title, body, data).catch(err => {
        console.error(`[OffersService] Failed to broadcast customer push for Campaign #${campaign.id}:`, err);
      });
    } catch (err) {
      console.error(`[OffersService] Error preparing push for Campaign #${campaign.id}:`, err);
    }
  }
}
