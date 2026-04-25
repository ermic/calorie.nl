'use client';

import { useMutation } from '@tanstack/react-query';
import { analyzePhoto } from '@/features/analyze-photo';
import { getGeminiKey } from '@/shared/lib/gemini-key-storage';
import type { PhotoAnalysis } from '@/entities/meal';

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type AnalyzeResponse = {
  analysis: PhotoAnalysis;
};

// Browser-side: roep Gemini direct aan met de user's eigen API key uit
// localStorage. De sleutel raakt onze server niet aan, dus een DB- of
// server-leak exposed geen API-keys. User's eigen Gemini-quota is de
// rate-limit; we doen geen server-side credit-tracking meer.
export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: async (file: File): Promise<AnalyzeResponse> => {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`Foto te groot (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)`);
      }
      const apiKey = getGeminiKey();
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY_MISSING');
      }
      const analysis = await analyzePhoto(file, apiKey);
      return { analysis };
    },
  });
}
