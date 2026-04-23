import type { Meal, MealItem } from '@/payload-types';

export type MealType = NonNullable<Meal['mealType']>;
export type { Meal, MealItem };

export function sumMealItems(items: MealItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Ontbijt',
  LUNCH: 'Lunch',
  DINNER: 'Diner',
  SNACK: 'Tussendoor',
};
