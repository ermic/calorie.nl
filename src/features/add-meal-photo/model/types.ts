import type { MealType } from '@/entities/meal';

export type EditableItem = {
  clientId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type { MealType };
