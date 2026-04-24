'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { CURRENT_USER_QUERY_KEY } from '@/features/auth';
import type { User } from '@/payload-types';
import type { ProfilePatch } from '../model/schema';

// Payload REST PATCH /api/users/:id. adminOrSelfUser access-rule laat
// een user alleen zijn eigen doc updaten; lockPrivilegedFieldsOnSelfWrite
// hook filtert plan/aiPhotoCredits/creditsResetAt/role uit het payload.
export function useUpdateProfile(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) =>
      apiFetch<{ doc: User }>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: patch,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
