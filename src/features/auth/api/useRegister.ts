'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { RegisterInput } from '@/shared/lib/schemas';
import type { User } from '@/payload-types';
import { useLogin } from './useLogin';

type CreateUserResponse = { doc: User };

export function useRegister() {
  const login = useLogin();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await apiFetch<CreateUserResponse>('/api/users', {
        method: 'POST',
        body: { name: input.name, email: input.email, password: input.password },
      });
      await login.mutateAsync({ email: input.email, password: input.password });
    },
  });
}
