'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { CURRENT_USER_QUERY_KEY } from '@/features/auth';

// Gebruikt onze eigen /api/meals/[id] endpoint omdat Payload's default
// DELETE de mealItems niet cascadet (FK staat op SET NULL).
export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) =>
      apiFetch<{ ok: true }>(`/api/meals/${mealId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
