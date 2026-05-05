import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  searchFoodsByVector,
  searchFoodsByVectorCached,
  type VectorHit,
} from './nutrientcontent';

// Geen netwerk: mock global fetch. Het echte env-fallback (BASE/KEY) komt
// uit defaults — we asserten alleen op de URL/headers/body die de wrapper
// uitstuurt, niet op een echte microservice.

function _hit(overrides: Partial<VectorHit> = {}): VectorHit {
  return {
    nevo_code: 1,
    name_nl: 'Aardappelen rauw',
    name_en: 'Potatoes raw',
    food_group_nl: 'Aardappelen',
    food_group_en: 'Potatoes',
    similarity: 0.9,
    ...overrides,
  };
}

function _okResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('searchFoodsByVector', () => {
  it('parses results and returns VectorHit[]', async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValueOnce(_okResponse({ query: 'kip', results: [_hit({ nevo_code: 42 })] }));

    const out = await searchFoodsByVector('kip');

    expect(out).toHaveLength(1);
    expect(out[0].nevo_code).toBe(42);
    expect(out[0].similarity).toBe(0.9);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('passes q + limit + min_similarity as query params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(_okResponse({ query: 'rice', results: [] }));

    await searchFoodsByVector('rice', { limit: 7, minSimilarity: 0.65 });

    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.pathname).toBe('/foods/vector');
    expect(url.searchParams.get('q')).toBe('rice');
    expect(url.searchParams.get('limit')).toBe('7');
    expect(url.searchParams.get('min_similarity')).toBe('0.65');
  });

  it('uses default limit=5 and min_similarity=0 when omitted', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(_okResponse({ query: 'x', results: [] }));

    await searchFoodsByVector('x');

    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('min_similarity')).toBe('0');
  });

  it('sends X-API-Key header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(_okResponse({ query: 'x', results: [] }));

    await searchFoodsByVector('x');

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    // KEY-leeg-in-prod wordt al bij module-import afgevangen; hier alleen
    // contract-asserten dat de header daadwerkelijk de wire op gaat.
    expect(headers.has('X-API-Key')).toBe(true);
  });

  it('throws NutrientContentError with status on non-2xx', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('upstream gemini boom', { status: 503 }),
    );

    await expect(searchFoodsByVector('x')).rejects.toMatchObject({
      name: 'NutrientContentError',
      status: 503,
    });
  });

  it('forwards AbortSignal', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(_okResponse({ query: 'x', results: [] }));
    const controller = new AbortController();

    await searchFoodsByVector('x', { signal: controller.signal });

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });
});

describe('searchFoodsByVectorCached', () => {
  it('returns cached result on second call with same args (no extra fetch)', async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValueOnce(_okResponse({ query: 'unique-cache-1', results: [_hit()] }));

    const a = await searchFoodsByVectorCached('unique-cache-1', { limit: 5, minSimilarity: 0.5 });
    const b = await searchFoodsByVectorCached('unique-cache-1', { limit: 5, minSimilarity: 0.5 });

    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('separates cache by query/limit/threshold', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(_okResponse({ query: 'unique-cache-2', results: [_hit({ nevo_code: 1 })] }))
      .mockResolvedValueOnce(_okResponse({ query: 'unique-cache-2', results: [_hit({ nevo_code: 2 })] }))
      .mockResolvedValueOnce(_okResponse({ query: 'unique-cache-3', results: [_hit({ nevo_code: 3 })] }));

    const a = await searchFoodsByVectorCached('unique-cache-2', { limit: 5, minSimilarity: 0.5 });
    const b = await searchFoodsByVectorCached('unique-cache-2', { limit: 6, minSimilarity: 0.5 });
    const c = await searchFoodsByVectorCached('unique-cache-3', { limit: 5, minSimilarity: 0.5 });

    expect(a[0].nevo_code).toBe(1);
    expect(b[0].nevo_code).toBe(2);
    expect(c[0].nevo_code).toBe(3);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });
});
