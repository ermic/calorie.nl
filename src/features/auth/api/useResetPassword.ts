'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/shared/lib/api';
import { markReturningUser } from '@/shared/lib/mark-returning-user';
import type { ResetPasswordInput } from '@/shared/lib/schemas';
import type { User } from '@/payload-types';
import { CURRENT_USER_QUERY_KEY } from './useCurrentUser';

type ResetPasswordResponse = {
  user: User;
  token?: string;
  exp?: number;
};

export function useResetPassword(token: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiFetch<ResetPasswordResponse>('/api/users/reset-password', {
        method: 'POST',
        body: { token, password: input.password },
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { user: data.user });
      await markReturningUser();
      router.push('/dashboard');
      router.refresh();
    },
  });
}
