'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/shared/lib/api';
import type { LoginInput } from '@/shared/lib/schemas';
import type { User } from '@/payload-types';
import { CURRENT_USER_QUERY_KEY } from './useCurrentUser';

type LoginResponse = {
  user: User;
  token?: string;
  exp?: number;
};

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<LoginResponse>('/api/users/login', {
        method: 'POST',
        body: { email: input.email, password: input.password },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { user: data.user });
      const rawRedirect = searchParams?.get('redirectTo');
      const redirectTo = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';
      router.push(redirectTo);
      router.refresh();
    },
  });
}
