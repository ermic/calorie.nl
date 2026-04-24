'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/features/auth';
import { setDailyGoalAction } from './actions';

export function useSetDailyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyCalorieGoal: number | null) => setDailyGoalAction(dailyCalorieGoal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
