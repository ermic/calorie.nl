'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { User } from '@/payload-types';

type MeResponse = { user: User | null };

export const CURRENT_USER_QUERY_KEY = ['me'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiFetch<MeResponse>('/api/users/me'),
    select: (data) => data.user,
    staleTime: 60_000,
  });
}
