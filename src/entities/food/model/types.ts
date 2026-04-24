import type { Food } from '@/payload-types';

export type { Food };

// Gedeeld formaat tussen /api/foods/search en de UI.
export type FoodSearchHit = {
  source: 'local' | 'off';
  id: number | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};
