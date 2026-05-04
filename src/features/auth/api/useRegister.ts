'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { RegisterInput } from '@/shared/lib/schemas';
import type { User } from '@/payload-types';
import { DEFAULT_TIMEZONE, isValidTimezone } from '@/shared/lib/timezone';
import { useLogin } from './useLogin';

type CreateUserResponse = { doc: User };

// Lees de browser-tz bij signup zodat de server-side day-buckets in de
// juiste user-tz draaien — niet die van de server (UTC). Wordt eenmalig
// vastgelegd op de User; later in profiel aanpasbaar (geen auto-update
// bij login, dat zou een reizende user verwarren).
function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function useRegister() {
  const login = useLogin();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await apiFetch<CreateUserResponse>('/api/users', {
        method: 'POST',
        body: {
          name: input.name,
          email: input.email,
          password: input.password,
          timezone: detectBrowserTimezone(),
        },
      });
      await login.mutateAsync({ email: input.email, password: input.password });
    },
  });
}
