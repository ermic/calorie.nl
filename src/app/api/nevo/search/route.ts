import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import {
  NutrientContentError,
  searchFoodsByVectorCached,
  searchFoodsCached,
} from '@/shared/api/nutrientcontent';
import { VECTOR_THRESHOLD_TYPEAHEAD } from '@/features/nevo-match';
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
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : DEFAULT_LIMIT),
  );

  // Buiten bereik = lege response (geen 4xx). Tijdens snel wissen vuurt de
  // typeahead anders rode foutstaten af terwijl er gewoon niets te zoeken is.
  if (q.length < MIN_QUERY || q.length > MAX_QUERY) {
    return NextResponse.json<NevoSearchResponse>({ results: [] });
  }

  try {
    const hits = await searchFoodsCached(q, { lang: 'nl', limit });
    if (hits.length > 0) {
      const results: NevoSuggestion[] = hits.map((h) => ({
        nevoCode: h.nevo_code,
        nameNl: h.name_nl,
        foodGroupNl: h.food_group_nl,
      }));
      return NextResponse.json<NevoSearchResponse>({ results });
    }

    // FTS = 0 hits → cascade naar vector. Zelfde threshold als de
    // foto-match flow (env-tunable via NEVO_VECTOR_THRESHOLD). Alléén
    // bij FTS-miss, dus géén Gemini-call per keystroke wanneer FTS al
    // suggesties geeft.
    try {
      const vec = await searchFoodsByVectorCached(q, {
        limit,
        minSimilarity: VECTOR_THRESHOLD_TYPEAHEAD,
      });
      if (vec.length) {
        // Geen rauwe q in de log: typeahead-queries kunnen persoonlijke
        // eetgewoontes onthullen. Aggregaten + bron-tag zijn genoeg.
        console.info(
          '[nevo/search]',
          JSON.stringify({ source: 'vector', hits: vec.length, top_sim: vec[0].similarity }),
        );
      }
      const results: NevoSuggestion[] = vec.map((v) => ({
        nevoCode: v.nevo_code,
        nameNl: v.name_nl,
        foodGroupNl: v.food_group_nl,
      }));
      return NextResponse.json<NevoSearchResponse>({ results });
    } catch (vErr) {
      // Vector down = geen catastrophe; FTS gaf al niks dus we geven
      // gewoon lege resultaten terug. Loggen voor monitoring.
      console.warn('[nevo/search] vector fallback failed', vErr);
      return NextResponse.json<NevoSearchResponse>({ results: [] });
    }
  } catch (err) {
    if (err instanceof NutrientContentError) {
      return NextResponse.json({ error: 'NEVO_UNAVAILABLE' }, { status: 503 });
    }
    console.error('[nevo/search] unexpected error', err);
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 });
  }
}
