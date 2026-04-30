'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { apiFetch } from '@/shared/lib/api';
import { CURRENT_USER_QUERY_KEY } from './useCurrentUser';

export function usePasskeyRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label?: string) => {
      const options = await apiFetch<PublicKeyCredentialCreationOptionsJSON>(
        '/api/auth/passkey/register/options',
        { method: 'POST', body: {} },
      );
      const attResponse = await startRegistration({ optionsJSON: options });
      return apiFetch<{ ok: true }>('/api/auth/passkey/register/verify', {
        method: 'POST',
        body: { response: attResponse, label },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
