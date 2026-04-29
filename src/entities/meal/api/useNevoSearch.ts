'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';

export type NevoSuggestion = {
  nevoCode: number;
  nameNl: string;
  foodGroupNl: string;
};

export type NevoSearchResponse = { results: NevoSuggestion[] };

export function useNevoSearch(query: string) {
  const q = query.trim();
  const enabled = q.length >= 2;
  return useQuery({
    queryKey: ['nevo', 'search', q],
    queryFn: () =>
      apiFetch<NevoSearchResponse>('/api/nevo/search', {
        params: { q, limit: 8 },
      }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    // keepPreviousData dempt blips; retries verdubbelen typeahead-latency.
    retry: 0,
  });
}
