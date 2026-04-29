'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { NevoPer100g } from '../model/types';

// Spiegel van CalculateResponse uit /api/nevo/calculate, beperkt tot wat
// de autocomplete gebruikt om macros van één gepicked item in te vullen.
type CalculateItemOut = {
  nevo_code: number;
  name_nl: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
type CalculateResponse = { items: CalculateItemOut[] };

export type NevoLookupInput = { nevoCode: number };

// We vragen altijd grams=100 op zodat we per-100g cachen in de
// EditableMealItem; quantity-rescaling gebeurt daarna lineair op de
// client zonder extra round-trip.
export function useNevoLookup() {
  return useMutation<NevoPer100g, Error, NevoLookupInput>({
    mutationFn: async ({ nevoCode }) => {
      const res = await apiFetch<CalculateResponse>('/api/nevo/calculate', {
        method: 'POST',
        body: { items: [{ nevoCode, grams: 100 }] },
      });
      const item = res.items[0];
      if (!item) throw new Error('NEVO_EMPTY_RESULT');
      return {
        calories: item.kcal,
        protein: item.protein_g,
        carbs: item.carbs_g,
        fat: item.fat_g,
      };
    },
    retry: 0,
  });
}
