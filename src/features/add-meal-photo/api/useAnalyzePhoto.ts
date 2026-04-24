'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { PhotoAnalysis } from '@/entities/meal';

export type AnalyzeResponse = {
  analysis: PhotoAnalysis;
  creditsRemaining: number | null;
};

export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: async (file: File): Promise<AnalyzeResponse> => {
      const form = new FormData();
      form.append('photo', file);
      return apiFetch<AnalyzeResponse>('/api/meals/analyze-photo', {
        method: 'POST',
        body: form,
      });
    },
  });
}
