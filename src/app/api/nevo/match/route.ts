import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { z } from 'zod';
import { getPayload } from '@/shared/lib/payload';
import {
  NutrientContentError,
  searchFoodsByVectorCached,
  searchFoodsCached,
} from '@/shared/api/nutrientcontent';
import {
  lookupOne,
  type MatchResult,
  VECTOR_LIMIT,
  VECTOR_THRESHOLD,
} from '@/features/nevo-match';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        state: z.string().max(50).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export type MatchEntry = {
  inputName: string;
  state?: string;
  match: { nevoCode: number; nameNl: string; foodGroupNl: string } | null;
  alternatives: { nevoCode: number; nameNl: string }[];
  /** Welke tak heeft de match gemaakt — laat de UI in de pipeline-log
   *  zien of vector-fallback heeft gevuurd. */
  source: 'fts' | 'vector' | 'none';
  /** Aanwezig wanneer FTS een topkandidaat had die door first-word check
   *  is afgewezen — handig om in de UI te tonen waarom we vector pakten. */
  rejectedFtsTop?: { nevoCode: number; nameEn: string; score: number };
};

export type MatchResponse = { items: MatchEntry[] };

export async function POST(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten() }, { status: 400 });
  }

  let serviceFailed = false;

  // De cascade leeft in features/nevo-match; deze route doet alleen IO-glue
  // + auth + logging. searchFts wraps alle FTS-fouten zodat ze als 'lege
  // hits' afgehandeld worden — service-uitval rapporteren we via een
  // aparte serviceFailed-flag voor de eind-503.
  const services = {
    async searchFts(q: string) {
      try {
        return await searchFoodsCached(q, { lang: 'en' });
      } catch (err) {
        if (err instanceof NutrientContentError && err.status >= 500) {
          serviceFailed = true;
        }
        console.warn('[nevo/match] FTS search failed for', q, err);
        return [];
      }
    },
    async searchVec(q: string) {
      return searchFoodsByVectorCached(q, {
        limit: VECTOR_LIMIT,
        minSimilarity: VECTOR_THRESHOLD,
      });
    },
  };

  const results: MatchResult[] = await Promise.all(
    parsed.data.items.map(({ name, state }) => lookupOne(name, state, services)),
  );

  // Logging voor Fase-4 evaluatie: telt per request hoeveel via FTS gingen,
  // hoeveel via vector zijn 'gered', en hoeveel `null` blijven. Per item
  // onder `[nevo/match]` met source-tag voor grep-ability in journalctl.
  for (const r of results) {
    console.info(
      '[nevo/match]',
      JSON.stringify({
        input: r.inputName,
        state: r.state,
        source: r.source,
        ...(r.match ? { nevoCode: r.match.nevoCode, name: r.match.nameNl } : {}),
        ...(r.rejectedFtsTop
          ? { rejectedFtsTop: r.rejectedFtsTop }
          : {}),
      }),
    );
  }

  if (serviceFailed && results.every((r) => !r.match)) {
    return NextResponse.json({ error: 'NEVO_UNAVAILABLE' }, { status: 503 });
  }

  // source + rejectedFtsTop gaan mee de wire op zodat de browser-pipeline-
  // log kan tonen of FTS of vector de match maakte (zie analyze.ts stap 2).
  const items: MatchEntry[] = results.map((r) => ({
    inputName: r.inputName,
    state: r.state,
    match: r.match,
    alternatives: r.alternatives,
    source: r.source,
    ...(r.rejectedFtsTop ? { rejectedFtsTop: r.rejectedFtsTop } : {}),
  }));

  return NextResponse.json<MatchResponse>({ items });
}
