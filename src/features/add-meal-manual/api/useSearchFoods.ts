'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/shared/lib/api';
import type { FoodSearchHit } from '@/entities/food';

type SearchResponse = {
  results: FoodSearchHit[];
  offAvailable: boolean;
  nevoAvailable: boolean;
};

export function useSearchFoods(query: string) {
  const q = query.trim();
  const enabled = q.length >= 2;
  return useQuery({
    queryKey: ['foods', 'search', q],
    queryFn: () =>
      apiFetch<SearchResponse>('/api/foods/search', {
        params: { q, limit: 12 },
      }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    // keepPreviousData dempt al transient blips; extra retries maken
    // typeahead-latency onnodig lang.
    retry: 0,
  });
}
