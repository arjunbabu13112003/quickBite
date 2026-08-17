import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Offer } from './offer.entity';
import { OfferRedemption } from './offer-redemption.entity';
import { Store99Campaign } from './store99-campaign.entity';
import { Store99Item } from './store99-item.entity';
import { Category } from '../categories/category.entity';
import { Food } from '../foods/food.entity';
import { Hotel } from '../hotels/hotel.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { Order } from '../orders/order.entity';

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
    private readonly dataSource: DataSource,
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

    return await this.offerRepository.save(offer);
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
      const catIds = dto.applicableCategoryIds || [];
      offer.applicableCategories = await this.categoryRepository.findByIds(catIds);
      offer.applicableFoods = [];
    } else if (offer.applicabilityType === 'foods') {
      const foodIds = dto.applicableFoodIds || [];
      offer.applicableFoods = await this.foodRepository.findByIds(foodIds);
      offer.applicableCategories = [];
    } else if (offer.applicabilityType === 'all') {
      offer.applicableCategories = [];
      offer.applicableFoods = [];
    }

    // Merge other fields
    const { code, startAt, endAt, applicableCategoryIds, applicableFoodIds, ...rest } = dto;
    Object.assign(offer, rest);

    return await this.offerRepository.save(offer);
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
      discountAmount = deliveryFee;
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

    await this.dataSource.transaction(async (manager) => {
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

  // ─── Super Admin Campaign Management Methods ───

  async getAllCampaigns(): Promise<any[]> {
    const campaigns = await this.campaignRepository.find({
      order: { createdAt: 'DESC' }
    });

    const result = [];
    for (const campaign of campaigns) {
      const items = await this.campaignItemRepository.find({
        where: { campaignId: campaign.id }
      });
      const hotelIds = [...new Set(items.map(item => item.hotelId))];
      const foodIds = items.filter(item => item.foodId !== -1).map(item => item.foodId);

      result.push({
        ...campaign,
        hotelCount: hotelIds.length,
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

    const items = await this.campaignItemRepository.find({
      where: { campaignId: id }
    });

    const hotelIds = [...new Set(items.map(item => item.hotelId))];
    const foodIds = items.filter(item => item.foodId !== -1).map(item => item.foodId);

    return {
      ...campaign,
      hotelIds,
      foodIds
    };
  }

  async createCampaign(dto: {
    name: string;
    description?: string;
    bannerUrl?: string;
    price: number;
    startAt: Date;
    endAt: Date;
    hotelIds: number[];
    foodIds: number[];
    isActive: boolean;
  }): Promise<Store99Campaign> {
    const campaign = this.campaignRepository.create({
      name: dto.name,
      description: dto.description,
      bannerUrl: dto.bannerUrl,
      price: dto.price || 99.00,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      isActive: dto.isActive !== undefined ? dto.isActive : true
    });

    const saved = await this.campaignRepository.save(campaign);
    await this.saveCampaignMappings(saved.id, dto.hotelIds, dto.foodIds);
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
    foodIds?: number[];
    isActive?: boolean;
  }): Promise<Store99Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.bannerUrl !== undefined) campaign.bannerUrl = dto.bannerUrl;
    if (dto.price !== undefined) campaign.price = dto.price;
    if (dto.startAt !== undefined) campaign.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) campaign.endAt = new Date(dto.endAt);
    if (dto.isActive !== undefined) campaign.isActive = dto.isActive;

    const saved = await this.campaignRepository.save(campaign);

    if (dto.hotelIds !== undefined || dto.foodIds !== undefined) {
      const items = await this.campaignItemRepository.find({ where: { campaignId: id } });
      const currentHotelIds = dto.hotelIds !== undefined ? dto.hotelIds : [...new Set(items.map(item => item.hotelId))];
      const currentFoodIds = dto.foodIds !== undefined ? dto.foodIds : items.filter(item => item.foodId !== -1).map(item => item.foodId);

      await this.saveCampaignMappings(id, currentHotelIds, currentFoodIds);
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
      await manager.delete(Store99Campaign, { id });
    });
  }

  async toggleCampaignActive(id: number): Promise<Store99Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    campaign.isActive = !campaign.isActive;
    return await this.campaignRepository.save(campaign);
  }

  private async saveCampaignMappings(campaignId: number, hotelIds: number[], foodIds: number[]) {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Store99Item, { campaignId });

      for (const hotelId of hotelIds) {
        const hotelFoods = await manager.find(Food, { where: { hotelId } });
        const hotelFoodIds = hotelFoods.map(f => f.id);
        const selectedFoodsForHotel = foodIds.filter(fid => hotelFoodIds.includes(fid));

        if (selectedFoodsForHotel.length === 0) {
          const item = manager.create(Store99Item, {
            campaignId,
            hotelId,
            foodId: -1,
            status: 'approved'
          });
          await manager.save(Store99Item, item);
        } else {
          for (const foodId of selectedFoodsForHotel) {
            const item = manager.create(Store99Item, {
              campaignId,
              hotelId,
              foodId,
              status: 'approved'
            });
            await manager.save(Store99Item, item);
          }
        }
      }
    });
  }
}
