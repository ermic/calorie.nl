'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';

export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true }>('/api/auth/verify-email/resend', {
        method: 'POST',
      }),
  });
}
