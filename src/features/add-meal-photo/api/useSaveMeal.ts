'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { CURRENT_USER_QUERY_KEY } from '@/features/auth';
import type { MealType } from '@/entities/meal';

export type SaveMealInput = {
  mealType: MealType;
  eatenAt?: string;
  aiAnalyzed: boolean;
  aiConfidence?: number;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
};

export type SaveMealResponse = { mealId: number };

export function useSaveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMealInput) =>
      apiFetch<SaveMealResponse>('/api/meals/save', { method: 'POST', body: input }),
    onSuccess: () => {
      // Dashboard + meals-overzicht zijn server-rendered (geen react-query
      // cache). Enige client-cache die kan verouderen is de huidige user
      // (ai-credits zijn gedaald). Toekomstige client-fetches van meals
      // kunnen hier bij.
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
