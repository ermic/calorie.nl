'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { ChangeEmailInput } from '@/shared/lib/schemas';

export function useChangeEmail() {
  return useMutation({
    mutationFn: (input: ChangeEmailInput) =>
      apiFetch<{ ok: true }>('/api/auth/change-email', {
        method: 'POST',
        body: { newEmail: input.newEmail, currentPassword: input.currentPassword },
      }),
  });
}
