import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { z } from 'zod';
import { getPayload } from '@/shared/lib/payload';
import { NutrientContentError, searchFoodsCached, type SearchHit } from '@/shared/api/nutrientcontent';

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
};

export type MatchResponse = { items: MatchEntry[] };

// We zoeken op de Engelse NEVO-namen omdat die consistenter zijn dan de
// Nederlandse afkortingen ("Onions boiled" vs. "Ui gekookt", "Sweet
// pepper red boiled" vs. "Paprika rode gekookt"). Het displayed item
// blijft Nederlands (name_nl uit de SearchHit).

const COOKED_PATTERNS = [
  'boiled',
  'cooked',
  'fried',
  'deep-fried',
  'prepared',
  'roasted',
  'grilled',
  'baked',
  'stewed',
  'steamed',
  'poached',
  'smoked',
];

function stripParens(s: string): string {
  return s.replace(/\(([^)]+)\)/g, '$1').replace(/\s+/g, ' ').trim();
}

// Score per kandidaat. Hoger = beter passend.
//   first-word match (start)        +10
//   first-word match (substring)    +4
//   exact state-woord in naam       +8
//   cooked vs raw categorie match   +6 / mismatch -4
function scoreHit(hit: SearchHit, cleanedName: string, state?: string): number {
  const hitName = hit.name_en.toLowerCase();
  const firstWord = cleanedName.split(/[\s,-]+/)[0] ?? '';
  let score = 0;

  if (firstWord) {
    const hitFirst = hitName.split(/\s+/)[0];
    // Plurals: "onions" startswith "onion" → match; "noodle" tegen "noodles" idem.
    if (hitFirst === firstWord) score += 10;
    else if (hitFirst.startsWith(firstWord) || firstWord.startsWith(hitFirst)) score += 8;
    else if (hitName.includes(firstWord)) score += 4;
  }

  if (state) {
    const stateLower = state.toLowerCase();
    if (stateLower !== 'raw' && hitName.includes(stateLower)) {
      score += 8;
    }
    const wantsCooked = stateLower !== 'raw';
    const isRaw = /(^|\s)raw\b/.test(hitName);
    const isCooked = COOKED_PATTERNS.some((p) => hitName.includes(p));
    if (wantsCooked) {
      if (isCooked) score += 6;
      else if (isRaw) score -= 4;
    } else {
      if (isRaw) score += 6;
      else if (isCooked) score -= 4;
    }
  }

  return score;
}

function toMatch(hit: SearchHit) {
  return { nevoCode: hit.nevo_code, nameNl: hit.name_nl, foodGroupNl: hit.food_group_nl };
}

export async function POST(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten() }, { status: 400 });
  }

  let serviceFailed = false;

  const lookups = parsed.data.items.map(async ({ name, state }): Promise<MatchEntry> => {
    const cleaned = stripParens(name).toLowerCase();
    const firstWord = cleaned.split(/[\s,-]+/)[0] ?? '';

    try {
      // State NIET meegeven — die maakt de FTS-fallback chaotisch wanneer
      // het state-woord niet in de target-naam zit.
      const hits = await searchFoodsCached(stripParens(name), { lang: 'en' });
      if (!hits.length) {
        return { inputName: name, state, match: null, alternatives: [] };
      }

      const ranked = hits
        .map((h) => ({ hit: h, score: scoreHit(h, cleaned, state) }))
        .sort((a, b) => b.score - a.score);

      // Reject als topkandidaat het hoofdwoord niet als hoofdwoord heeft —
      // voorkomt dat 'noodle' valt op 'Chinese noodle ball deep-fried'.
      const top = ranked[0];
      const topFirst = top.hit.name_en.toLowerCase().split(/\s+/)[0];
      const accepted =
        firstWord !== '' &&
        (topFirst === firstWord ||
          topFirst.startsWith(firstWord) ||
          firstWord.startsWith(topFirst));

      return {
        inputName: name,
        state,
        match: accepted ? toMatch(top.hit) : null,
        alternatives: ranked
          .slice(accepted ? 1 : 0, 4)
          .map(({ hit }) => ({ nevoCode: hit.nevo_code, nameNl: hit.name_nl })),
      };
    } catch (err) {
      if (err instanceof NutrientContentError && err.status >= 500) {
        serviceFailed = true;
      }
      console.warn('[nevo/match] search failed for', name, err);
      return { inputName: name, state, match: null, alternatives: [] };
    }
  });

  const items = await Promise.all(lookups);

  if (serviceFailed && items.every((i) => !i.match)) {
    return NextResponse.json({ error: 'NEVO_UNAVAILABLE' }, { status: 503 });
  }

  return NextResponse.json<MatchResponse>({ items });
}
