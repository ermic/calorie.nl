'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { PhotoAnalysis } from '../model/photo-analysis';
import type { MealType } from '../model/types';

// Vrije log-shape — 1:1 met features/analyze-photo PipelineLogEntry, maar
// hier los gedeclareerd om een feature-import vanuit entities te
// vermijden (FSD-laagschending).
export type SaveMealPipelineEntry = {
  ts: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
};

export type SaveMealInput = {
  mealType: MealType;
  eatenAt?: string;
  aiAnalyzed: boolean;
  aiConfidence?: number;
  // 1 (slecht) t/m 5 (top); afwezig wanneer de gebruiker geen smiley koos.
  userRating?: number;
  // Volledige originele AI-output, ongeschonden door user-edits.
  aiSnapshot?: PhotoAnalysis;
  // Pipeline-trace (NEVO-matches, fallbacks, weights). Alleen bewaard
  // voor toekomstige model-tuning.
  pipelineDebug?: SaveMealPipelineEntry[];
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

// Moet overeenkomen met features/auth useCurrentUser. Geen import uit
// features/ om de FSD-laag niet te kruisen — het key-contract is
// project-conventie.
const ME_QUERY_KEY = ['me'] as const;

export function useSaveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMealInput) =>
      apiFetch<SaveMealResponse>('/api/meals/save', { method: 'POST', body: input }),
    onSuccess: () => {
      // Dashboard + meals-overzicht zijn server-rendered. Alleen de user-
      // cache kan verouderen (ai-credits zijn gedaald bij photo-save).
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
