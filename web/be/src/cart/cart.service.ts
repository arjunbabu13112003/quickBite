import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { CartItemCustomizationChoice } from './cart-item-customization-choice.entity';
import { Food } from '../foods/food.entity';
import { FoodCustomizationChoice } from '../food-customizations/food-customization-choice.entity';
import { FoodCustomizationGroup } from '../food-customizations/food-customization-group.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(CartItemCustomizationChoice)
    private readonly choiceMappingRepository: Repository<CartItemCustomizationChoice>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
    @InjectRepository(FoodCustomizationChoice)
    private readonly choiceRepository: Repository<FoodCustomizationChoice>,
    @InjectRepository(FoodCustomizationGroup)
    private readonly groupRepository: Repository<FoodCustomizationGroup>,
    private readonly dataSource: DataSource,
  ) {}

  async addToCart(userId: number, dto: AddToCartDto) {
    // 1. Verify active food, category and hotel
    const food = await this.foodRepository.findOne({
      where: { id: dto.foodId },
      relations: ['hotel', 'category'],
    });

    if (!food || !food.isActive) {
      throw new NotFoundException(
        `Food with ID ${dto.foodId} not found or is inactive`,
      );
    }

    if (!food.isAvailable) {
      throw new BadRequestException('Food item is currently unavailable');
    }

    if (!food.hotel || !food.hotel.isActive) {
      throw new BadRequestException(
        'Hotel associated with this food is inactive or does not exist',
      );
    }

    if (!food.hotel.isOpen) {
      throw new BadRequestException('Hotel is currently closed');
    }

    if (!food.hotel.acceptsOrders) {
      throw new BadRequestException('Hotel is currently not accepting orders');
    }

    if (!food.category || !food.category.isActive) {
      throw new BadRequestException(
        'Category associated with this food is inactive or does not exist',
      );
    }

    // 2. Validate customization groups and choices
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

    const submittedChoiceIds = dto.choiceIds || [];

    // Verify all submitted choices are valid and active for this food
    for (const choiceId of submittedChoiceIds) {
      if (!allValidChoiceIds.has(choiceId)) {
        throw new BadRequestException(
          `Choice ID ${choiceId} is invalid, inactive, unavailable, or does not belong to the selected food`,
        );
      }
    }

    // Verify selection constraints per group
    for (const group of activeGroups) {
      const groupChoiceIds = (group.choices || [])
        .filter((c) => c.isActive && c.isAvailable)
        .map((c) => c.id);

      const selectedCount = submittedChoiceIds.filter((id) =>
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

    // 3. Price calculations
    let unitPrice = food.offerPrice !== undefined && food.offerPrice !== null ? parseFloat(food.offerPrice.toString()) : parseFloat(food.price.toString());
    let customizationPrice = 0;
    
    submittedChoiceIds.forEach((choiceId) => {
      const choiceObj = choiceIdToObj.get(choiceId);
      if (choiceObj) {
        customizationPrice += parseFloat(choiceObj.additionalPrice.toString());
      }
    });

    const finalUnitPrice = parseFloat(
      (unitPrice + customizationPrice).toFixed(2),
    );

    // 4. Run database transaction to write atomic updates
    return await this.dataSource.transaction(async (manager) => {
      let cart = await manager.findOne(Cart, {
        where: { userId },
        relations: ['items', 'items.customizationChoices'],
      });

      if (!cart) {
        cart = manager.create(Cart, {
          userId,
          hotelId: food.hotelId,
        });
        cart = await manager.save(Cart, cart);
        cart.items = [];
      } else {
        const hasItems = cart.items && cart.items.length > 0;
        if (hasItems) {
          if (cart.hotelId !== food.hotelId) {
            throw new ConflictException(
              'Your cart contains items from another hotel. Clear the cart before adding items from this hotel.',
            );
          }
        } else {
          // If existing cart is empty, update the hotelId assignment
          cart.hotelId = food.hotelId;
          await manager.save(Cart, cart);
        }
      }

      // Check if an identical cart item exists
      let identicalItem: CartItem | null = null;
      if (cart.items) {
        for (const item of cart.items) {
          if (item.foodId === food.id) {
            const itemChoiceIds = item.customizationChoices
              ? item.customizationChoices.map((c) => c.choiceId)
              : [];
            const setA = new Set(itemChoiceIds);
            const setB = new Set(submittedChoiceIds);

            if (
              setA.size === setB.size &&
              [...setA].every((x) => setB.has(x))
            ) {
              identicalItem = item;
              break;
            }
          }
        }
      }

      if (identicalItem) {
        const totalQuantity = identicalItem.quantity + dto.quantity;
        if (totalQuantity > 50) {
          throw new BadRequestException('Quantity per item cannot exceed 50');
        }

        identicalItem.unitPrice = unitPrice;
        identicalItem.customizationPrice = customizationPrice;
        identicalItem.finalUnitPrice = finalUnitPrice;
        identicalItem.quantity = totalQuantity;

        await manager.save(CartItem, identicalItem);
        return {
          message: 'Cart item quantity updated',
          cartItem: identicalItem,
        };
      } else {
        // Create new CartItem
        const cartItem = manager.create(CartItem, {
          cartId: cart.id,
          foodId: food.id,
          quantity: dto.quantity,
          unitPrice,
          customizationPrice,
          finalUnitPrice,
        });

        const savedItem = await manager.save(CartItem, cartItem);

        if (submittedChoiceIds.length > 0) {
          const mappingEntities = submittedChoiceIds.map((choiceId) =>
            manager.create(CartItemCustomizationChoice, {
              cartItemId: savedItem.id,
              choiceId,
            }),
          );
          await manager.save(CartItemCustomizationChoice, mappingEntities);
        }

        return {
          message: 'Item added to cart',
          cartItem: savedItem,
        };
      }
    });
  }

  async getCart(userId: number) {
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

    if (!cart) {
      return {
        cartId: null,
        hotel: null,
        items: [],
        itemCount: 0,
        subtotal: 0,
      };
    }

    let itemCount = 0;
    let subtotal = 0;
    const itemsList = [];

    if (cart.items) {
      // Sort items by ID for consistency
      const sortedItems = [...cart.items].sort((a, b) => a.id - b.id);

      for (const item of sortedItems) {
        itemCount += item.quantity;
        const lineTotal = parseFloat(
          (item.finalUnitPrice * item.quantity).toFixed(2),
        );
        subtotal += lineTotal;

        // Dynamic validation calculations
        let isValid = true;
        let validationMessage = '';

        const food = item.food;
        const hotel = cart.hotel;
        const category = food?.category;

        if (!food || !food.isActive) {
          isValid = false;
          validationMessage = 'Food item is inactive or no longer exists';
        } else if (!food.isAvailable) {
          isValid = false;
          validationMessage = 'Food item is temporarily unavailable';
        } else if (!hotel || !hotel.isActive) {
          isValid = false;
          validationMessage = 'Hotel associated with this item is inactive';
        } else if (!hotel.isOpen) {
          isValid = false;
          validationMessage = 'Hotel is currently closed';
        } else if (!hotel.acceptsOrders) {
          isValid = false;
          validationMessage = 'Hotel is not accepting orders at this time';
        } else if (!category || !category.isActive) {
          isValid = false;
          validationMessage = 'Category associated with this food is inactive';
        } else {
          // Check customization choice validity and group selection rules
          const activeGroups = await this.groupRepository.find({
            where: { foodId: food.id, isActive: true },
            relations: ['choices'],
          });

          const allValidChoiceIds = new Set<number>();
          activeGroups.forEach((group) => {
            if (group.choices) {
              group.choices.forEach((choice) => {
                if (choice.isActive && choice.isAvailable) {
                  allValidChoiceIds.add(choice.id);
                }
              });
            }
          });

          const selectedChoiceIds = (item.customizationChoices || []).map(
            (c) => c.choiceId,
          );

          // Verify all selected choice IDs are still valid
          for (const choiceId of selectedChoiceIds) {
            if (!allValidChoiceIds.has(choiceId)) {
              isValid = false;
              validationMessage =
                'One or more selected customizations are no longer available';
              break;
            }
          }

          if (isValid) {
            // Verify group selection counts
            for (const group of activeGroups) {
              const groupChoiceIds = (group.choices || [])
                .filter((c) => c.isActive && c.isAvailable)
                .map((c) => c.id);

              const selectedCount = selectedChoiceIds.filter((id) =>
                groupChoiceIds.includes(id),
              ).length;

              const minSelection = group.isRequired ? 1 : 0;
              const maxSelection = group.selectionType === 'single' ? 1 : 999;
              if (
                selectedCount < minSelection ||
                selectedCount > maxSelection
              ) {
                isValid = false;
                validationMessage = `Selection requirements for "${group.name}" have changed`;
                break;
              }
            }
          }
        }

        const customizations = [];
        if (item.customizationChoices) {
          // Sort customizations by group/choice order for consistency
          const sortedMappings = [...item.customizationChoices].sort((a, b) => {
            const groupA = a.foodCustomizationChoice?.group;
            const groupB = b.foodCustomizationChoice?.group;
            const orderA = groupA?.displayOrder ?? 0;
            const orderB = groupB?.displayOrder ?? 0;
            if (orderA !== orderB) return orderA - orderB;

            const idA = groupA?.id ?? 0;
            const idB = groupB?.id ?? 0;
            if (idA !== idB) return idA - idB;

            const choiceOrderA = a.foodCustomizationChoice?.displayOrder ?? 0;
            const choiceOrderB = b.foodCustomizationChoice?.displayOrder ?? 0;
            if (choiceOrderA !== choiceOrderB) return choiceOrderA - choiceOrderB;

            return (a.foodCustomizationChoice?.id ?? 0) - (b.foodCustomizationChoice?.id ?? 0);
          });

          sortedMappings.forEach((m) => {
            const choice = m.foodCustomizationChoice;
            const group = choice?.group;
            if (choice && group) {
              customizations.push({
                groupId: group.id,
                groupName: group.name,
                choiceId: choice.id,
                choiceName: choice.name,
                additionalPrice: parseFloat(choice.additionalPrice.toString()),
              });
            }
          });
        }

        itemsList.push({
          id: item.id,
          food: {
            id: item.food?.id,
            name: item.food?.name,
            image: item.food?.image,
            isAvailable: item.food?.isAvailable,
          },
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice.toString()),
          customizationPrice: parseFloat(item.customizationPrice.toString()),
          finalUnitPrice: parseFloat(item.finalUnitPrice.toString()),
          lineTotal,
          customizations,
          isValid,
          validationMessage,
        });
      }
    }

    const hasItems = itemsList.length > 0;
    const hotelPublic =
      hasItems && cart.hotel
        ? (() => {
            const { gstNumber: _, fssaiNumber: __, ...rest } = cart.hotel;
            return rest;
          })()
        : null;

    return {
      cartId: cart.id,
      hotel: hotelPublic,
      items: itemsList,
      itemCount,
      subtotal: parseFloat(subtotal.toFixed(2)),
    };
  }

  async updateCartItemQuantity(
    userId: number,
    cartItemId: number,
    dto: UpdateCartItemQuantityDto,
  ) {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart', 'customizationChoices'],
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`);
    }

    // 1. Revalidate food, category, hotel state and selection requirements
    const food = await this.foodRepository.findOne({
      where: { id: cartItem.foodId },
      relations: ['hotel', 'category'],
    });

    if (!food || !food.isActive || !food.isAvailable) {
      throw new BadRequestException(
        'Cart item is no longer available. Please review your cart.',
      );
    }

    if (
      !food.hotel ||
      !food.hotel.isActive ||
      !food.hotel.isOpen ||
      !food.hotel.acceptsOrders
    ) {
      throw new BadRequestException(
        'Cart item is no longer available. Please review your cart.',
      );
    }

    if (!food.category || !food.category.isActive) {
      throw new BadRequestException(
        'Cart item is no longer available. Please review your cart.',
      );
    }

    // 2. Revalidate customization choice records
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
            choiceIdToObj.set(choice.id, choice);
          }
        });
      }
    });

    const selectedChoiceIds = (cartItem.customizationChoices || []).map(
      (c) => c.choiceId,
    );

    // Verify all selected choices are still active/available
    for (const choiceId of selectedChoiceIds) {
      if (!allValidChoiceIds.has(choiceId)) {
        throw new BadRequestException(
          'Cart item is no longer available. Please review your cart.',
        );
      }
    }

    // Revalidate selections per active group
    for (const group of activeGroups) {
      const groupChoiceIds = (group.choices || [])
        .filter((c) => c.isActive && c.isAvailable)
        .map((c) => c.id);

      const selectedCount = selectedChoiceIds.filter((id) =>
        groupChoiceIds.includes(id),
      ).length;

      const minSelection = group.isRequired ? 1 : 0;
      const maxSelection = group.selectionType === 'single' ? 1 : 999;
      if (
        selectedCount < minSelection ||
        selectedCount > maxSelection
      ) {
        throw new BadRequestException(
          'Cart item is no longer available. Please review your cart.',
        );
      }
    }

    // 3. Recalculate price using current database state
    const unitPrice = food.offerPrice !== undefined && food.offerPrice !== null ? parseFloat(food.offerPrice.toString()) : parseFloat(food.price.toString());
    let customizationPrice = 0;
    selectedChoiceIds.forEach((choiceId) => {
      const choiceObj = choiceIdToObj.get(choiceId);
      if (choiceObj) {
        customizationPrice += parseFloat(choiceObj.additionalPrice.toString());
      }
    });

    const finalUnitPrice = parseFloat(
      (unitPrice + customizationPrice).toFixed(2),
    );

    cartItem.unitPrice = unitPrice;
    cartItem.customizationPrice = customizationPrice;
    cartItem.finalUnitPrice = finalUnitPrice;
    cartItem.quantity = dto.quantity;

    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeCartItem(userId: number, cartItemId: number) {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart'],
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      // Return refreshed cart for idempotency
      return this.getCart(userId);
    }

    await this.cartItemRepository.remove(cartItem);

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (cart) {
      await this.cartRepository.remove(cart);
    }

    return {
      cartId: null,
      hotel: null,
      items: [],
      itemCount: 0,
      subtotal: 0,
    };
  }
}
