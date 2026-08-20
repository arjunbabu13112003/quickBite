import { DataSource } from 'typeorm';
import { Food } from '../foods/food.entity';

export async function resolveHotelOfferForFood(
  dataSource: DataSource,
  food: Food,
  now = new Date(),
): Promise<{ offerPrice: number | null; offerId: number | null; offerLabel: string | null }> {
  const hotelId = food.hotelId;
  const offers = await dataSource.query(`
    SELECT o.id, o.name, o."discountType", o."discountValue", o."maxDiscount", o."applicabilityType", o."minimumOrderValue"
    FROM offers o
    WHERE (o."hotelId" = $1 OR o."hotelId" IS NULL)
      AND o."isActive" = true
      AND o."startAt" <= $2
      AND o."endAt" >= $3
    ORDER BY o."createdAt" DESC
  `, [hotelId, now, now]);

  if (!offers || offers.length === 0) {
    return { offerPrice: null, offerId: null, offerLabel: null };
  }

  let bestPrice = Number(food.price);
  let appliedOfferId = null;
  let appliedOfferLabel = null;

  for (const offer of offers) {
    let isApplicable = false;

    if (offer.applicabilityType === 'all') {
      isApplicable = true;
    } else if (offer.applicabilityType === 'categories') {
      const catCheck = await dataSource.query(`
        SELECT 1 FROM offer_categories 
        WHERE "offerId" = $1 AND "categoryId" = $2
        LIMIT 1
      `, [offer.id, food.categoryId]);
      if (catCheck && catCheck.length > 0) {
        isApplicable = true;
      }
    } else if (offer.applicabilityType === 'foods') {
      const foodCheck = await dataSource.query(`
        SELECT 1 FROM offer_foods 
        WHERE "offerId" = $1 AND "foodId" = $2
        LIMIT 1
      `, [offer.id, food.id]);
      if (foodCheck && foodCheck.length > 0) {
        isApplicable = true;
      }
    }

    if (isApplicable) {
      let offerPrice = Number(food.price);
      let label = '';
      if (offer.discountType === 'percentage') {
        const disc = (offerPrice * Number(offer.discountValue)) / 100;
        offerPrice = Math.max(0, offerPrice - (offer.maxDiscount ? Math.min(disc, Number(offer.maxDiscount)) : disc));
        label = `${Math.round(offer.discountValue)}% OFF`;
      } else if (offer.discountType === 'flat') {
        offerPrice = Math.max(0, offerPrice - Number(offer.discountValue));
        label = `₹${Math.round(offer.discountValue)} OFF`;
      } else if (offer.discountType === 'free_delivery') {
        offerPrice = Number(food.price);
        label = 'FREE DELIVERY';
      }

      if (offerPrice < bestPrice || (appliedOfferId === null)) {
        if (offerPrice < bestPrice || (offerPrice === bestPrice && offer.discountType === 'free_delivery')) {
          bestPrice = offerPrice;
          appliedOfferId = offer.id;
          appliedOfferLabel = label;
        }
      }
    }
  }

  if (appliedOfferId !== null && (bestPrice < Number(food.price) || appliedOfferLabel === 'FREE DELIVERY')) {
    return {
      offerPrice: bestPrice,
      offerId: appliedOfferId,
      offerLabel: appliedOfferLabel,
    };
  }

  return { offerPrice: null, offerId: null, offerLabel: null };
}
