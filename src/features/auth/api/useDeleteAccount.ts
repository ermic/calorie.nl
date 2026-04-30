'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/shared/lib/api';
import type { DeleteAccountInput } from '@/shared/lib/schemas';
import { CURRENT_USER_QUERY_KEY } from './useCurrentUser';

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: DeleteAccountInput) =>
      apiFetch<{ ok: true }>('/api/auth/account/delete', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      // Cache-invalidate i.p.v. setQueryData(null): /api/users/me geeft
      // na cookie-clear `null` terug, zodat de useCurrentUser-state
      // overal correct refresh.
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { user: null });
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      router.push('/login?account_deleted=1');
      router.refresh();
    },
  });
}
