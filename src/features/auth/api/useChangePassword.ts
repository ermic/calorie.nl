'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { ChangePasswordInput } from '@/shared/lib/schemas';

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiFetch<{ ok: true }>('/api/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          newPasswordConfirm: input.newPasswordConfirm,
        },
      }),
  });
}
