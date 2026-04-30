'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import { CURRENT_USER_QUERY_KEY } from './useCurrentUser';

export type UnlinkableProvider = 'google' | 'facebook';

export function useUnlinkProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: UnlinkableProvider) =>
      apiFetch<{ ok: true }>(`/api/auth/providers/${provider}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
