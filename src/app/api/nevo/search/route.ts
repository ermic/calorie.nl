import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import { NutrientContentError, searchFoodsCached } from '@/shared/api/nutrientcontent';
import type { NevoSearchResponse, NevoSuggestion } from '@/entities/meal/api/useNevoSearch';

export const runtime = 'nodejs';

const MIN_QUERY = 2;
const MAX_QUERY = 100;
const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 8;

export async function GET(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const requested = Number(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requested) ? requested : DEFAULT_LIMIT));

  // Buiten bereik = lege response (geen 4xx). Tijdens snel wissen vuurt de
  // typeahead anders rode foutstaten af terwijl er gewoon niets te zoeken is.
  if (q.length < MIN_QUERY || q.length > MAX_QUERY) {
    return NextResponse.json<NevoSearchResponse>({ results: [] });
  }

  try {
    const hits = await searchFoodsCached(q, { lang: 'nl', limit });
    const results: NevoSuggestion[] = hits.map((h) => ({
      nevoCode: h.nevo_code,
      nameNl: h.name_nl,
      foodGroupNl: h.food_group_nl,
    }));
    return NextResponse.json<NevoSearchResponse>({ results });
  } catch (err) {
    if (err instanceof NutrientContentError) {
      return NextResponse.json({ error: 'NEVO_UNAVAILABLE' }, { status: 503 });
    }
    console.error('[nevo/search] unexpected error', err);
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 });
  }
}
