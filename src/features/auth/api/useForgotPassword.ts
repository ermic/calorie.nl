'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { ForgotPasswordInput } from '@/shared/lib/schemas';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiFetch<{ message: string }>('/api/users/forgot-password', {
        method: 'POST',
        body: { email: input.email },
      }),
  });
}
