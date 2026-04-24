'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/features/auth';
import type { ProfilePatch } from '../model/schema';
import { updateProfileAction } from './actions';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfileAction(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
