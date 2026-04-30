'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { apiFetch } from '@/shared/lib/api';
import type { User } from '@/payload-types';
import { CURRENT_USER_QUERY_KEY } from './useCurrentUser';

type LoginResponse = { user: User };

export function usePasskeyLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: async (email?: string) => {
      const options = await apiFetch<PublicKeyCredentialRequestOptionsJSON>(
        '/api/auth/passkey/login/options',
        { method: 'POST', body: { email } },
      );
      const assertion = await startAuthentication({ optionsJSON: options });
      return apiFetch<LoginResponse>('/api/auth/passkey/login/verify', {
        method: 'POST',
        body: { response: assertion },
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { user: data.user });
      const rawRedirect = searchParams?.get('redirectTo');
      const redirectTo =
        rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
          ? rawRedirect
          : '/';
      router.push(redirectTo);
      router.refresh();
    },
  });
}
