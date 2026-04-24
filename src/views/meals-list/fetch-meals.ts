import { getPayload } from '@/shared/lib/payload';
import { sumMealItems, type Meal, type MealItem, type MealTotals } from '@/entities/meal';
import type { User } from '@/payload-types';

export type MealListItem = Pick<Meal, 'id' | 'mealType' | 'eatenAt' | 'photoUrl' | 'createdAt'> & {
  totals: MealTotals;
};

export type MealsPage = {
  meals: MealListItem[];
  hasMore: boolean;
  nextOffset: number;
};

const ITEM_FETCH_LIMIT = 2000;

// Haalt een pagina meals + bijbehorende item-totalen op voor één user.
// BELANGRIJK: expliciete user-filter op elke query — niet alleen steunen
// op ownByUser access-rule — zodat admins via deze route géén meals van
// andere users kunnen ophalen. De call doet bovendien overrideAccess:
// false + user voor defense-in-depth.
export async function fetchMealsPage({
  user,
  offset,
  limit,
}: {
  user: User;
  offset: number;
  limit: number;
}): Promise<MealsPage> {
  const payload = await getPayload();

  const result = await payload.find({
    collection: 'meals',
    where: { user: { equals: user.id } },
    sort: '-eatenAt',
    limit,
    page: Math.floor(offset / limit) + 1,
    depth: 0,
    overrideAccess: false,
    user,
  });

  let itemsByMeal = new Map<number, MealItem[]>();
  if (result.docs.length > 0) {
    // mealIds zijn al gescoped op de huidige user (meals-find boven deed
    // user-filter + overrideAccess); ownViaMeal + overrideAccess hier
    // valideert nogmaals op item-niveau.
    const { docs: items } = await payload.find({
      collection: 'mealItems',
      where: { meal: { in: result.docs.map((m) => m.id) } },
      limit: ITEM_FETCH_LIMIT,
      depth: 0,
      pagination: false,
      overrideAccess: false,
      user,
    });
    if (items.length === ITEM_FETCH_LIMIT) {
      console.warn('[fetchMealsPage] item-fetch limit bereikt — per-meal totalen kunnen onderschat zijn');
    }
    itemsByMeal = items.reduce((map, item) => {
      const mealId = typeof item.meal === 'object' ? item.meal.id : item.meal;
      const list = map.get(mealId) ?? [];
      list.push(item);
      map.set(mealId, list);
      return map;
    }, new Map<number, MealItem[]>());
  }

  const meals: MealListItem[] = result.docs.map((m) => {
    const totals = sumMealItems(itemsByMeal.get(m.id) ?? []);
    return {
      id: m.id,
      mealType: m.mealType,
      eatenAt: m.eatenAt,
      photoUrl: m.photoUrl,
      createdAt: m.createdAt,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
      },
    };
  });

  const totalSoFar = offset + meals.length;
  return {
    meals,
    hasMore: totalSoFar < result.totalDocs,
    nextOffset: totalSoFar,
  };
}
