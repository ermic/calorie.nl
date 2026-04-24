'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { CURRENT_USER_QUERY_KEY } from '@/features/auth';
import type { User } from '@/payload-types';

export function useSetDailyGoal(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyCalorieGoal: number | null) =>
      apiFetch<{ doc: User }>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: { dailyCalorieGoal },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
