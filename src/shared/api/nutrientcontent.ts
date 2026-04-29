import 'server-only';

const BASE = process.env.NUTRIENTCONTENT_BASE_URL ?? 'http://127.0.0.1:5555';
const KEY = process.env.NUTRIENTCONTENT_API_KEY ?? '';

if (!KEY && process.env.NODE_ENV === 'production') {
  throw new Error('NUTRIENTCONTENT_API_KEY missing');
}

export class NutrientContentError extends Error {
  constructor(
    msg: string,
    public status: number,
  ) {
    super(msg);
    this.name = 'NutrientContentError';
  }
}

export type SearchHit = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  food_group_nl: string;
  food_group_en: string;
};

export type NutrientValue = {
  code: string;
  name_nl: string;
  name_en: string;
  group_nl: string;
  group_en: string;
  unit: string;
  value_per_100: number | null;
};

export type FoodDetail = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  food_group_nl: string;
  food_group_en: string;
  quantity: string;
  synonyms: string | null;
  note: string | null;
  nutrients: NutrientValue[];
};

export type CalcRequestItem = { nevo_code: number; grams: number };

export type CalcTotals = {
  kcal: number;
  kj: number;
  protein_g: number;
  fat_g: number;
  saturated_fat_g: number;
  carbs_g: number;
  sugar_g: number;
  fiber_g: number;
  salt_g: number;
};

export type CalcItemOut = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  grams: number;
  kcal: number;
};

export type CalcResponse = { totals: CalcTotals; items: CalcItemOut[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(new URL(path, BASE), {
    ...init,
    headers: {
      'X-API-Key': KEY,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {
      // empty body
    }
    throw new NutrientContentError(
      `nutrientcontent ${path} -> ${res.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export async function searchFoods(
  q: string,
  opts?: { lang?: 'nl' | 'en'; limit?: number; signal?: AbortSignal },
): Promise<SearchHit[]> {
  const url = new URL('/foods', BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('lang', opts?.lang ?? 'nl');
  url.searchParams.set('limit', String(opts?.limit ?? 5));
  const json = await request<{ query: string; results: SearchHit[] }>(
    `/foods?${url.searchParams.toString()}`,
    { signal: opts?.signal },
  );
  return json.results;
}

export async function fetchFoodDetail(nevoCode: number, opts?: { signal?: AbortSignal }): Promise<FoodDetail> {
  return request<FoodDetail>(`/foods/${nevoCode}`, { signal: opts?.signal });
}

export async function calculate(
  items: CalcRequestItem[],
  opts?: { signal?: AbortSignal },
): Promise<CalcResponse> {
  return request<CalcResponse>('/calculate', {
    method: 'POST',
    body: JSON.stringify({ items }),
    signal: opts?.signal,
  });
}

// In-process LRU. Voorkomt dat dezelfde "kipfilet" of nevo_code voor elke
// foto opnieuw de microservice raakt. Niet thread-safe over workers, maar
// dev/prod draait Next op één node-proces per host.
type CacheEntry<T> = { value: T; expiresAt: number };

class TtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(
    private maxEntries: number,
    private ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Move-to-front voor LRU.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

const SEARCH_CACHE = new TtlCache<SearchHit[]>(200, 10 * 60_000);
const DETAIL_CACHE = new TtlCache<FoodDetail>(200, 10 * 60_000);

export async function searchFoodsCached(
  q: string,
  opts?: { lang?: 'nl' | 'en'; limit?: number },
): Promise<SearchHit[]> {
  const lang = opts?.lang ?? 'nl';
  const limit = opts?.limit ?? 10;
  const key = `${lang}:${limit}:${q.toLowerCase()}`;
  const cached = SEARCH_CACHE.get(key);
  if (cached) return cached;
  const fresh = await searchFoods(q, { lang, limit });
  SEARCH_CACHE.set(key, fresh);
  return fresh;
}

export async function fetchFoodDetailCached(nevoCode: number): Promise<FoodDetail> {
  const key = String(nevoCode);
  const cached = DETAIL_CACHE.get(key);
  if (cached) return cached;
  const fresh = await fetchFoodDetail(nevoCode);
  DETAIL_CACHE.set(key, fresh);
  return fresh;
}
