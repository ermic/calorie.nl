// Pure NEVO-match-logica: FTS-eerst, vector-fallback bij rejecten of leegte.
// Géén IO hier — de route handler doet de fetches en levert hits aan
// pickMatch zodat alle beslissingen unit-testbaar zijn.

import type { SearchHit, VectorHit } from '@/shared/api/nutrientcontent';

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

// Cosine-similarity drempel. Onder deze waarde vertrouwen we de
// vector-match niet — beter `match: null` zodat Gemini's eigen macro-
// schatting de slot vult dan een verkeerde NEVO-rij in de telling.
// Ondergrens komt uit empirische check op fase 1f (relevant ≥ ~0.7,
// duidelijk irrelevant ≤ ~0.55).
export const VECTOR_THRESHOLD = 0.65;

// Hoeveel vector-kandidaten we ophalen. >5 voegt zelden iets toe en
// kost extra DB-werk per missing FTS-hit.
export const VECTOR_LIMIT = 5;

export type MatchEntry = {
  inputName: string;
  state?: string;
  match: { nevoCode: number; nameNl: string; foodGroupNl: string } | null;
  alternatives: { nevoCode: number; nameNl: string }[];
};

export type MatchSource = 'fts' | 'vector' | 'none';

export type MatchResult = MatchEntry & {
  source: MatchSource;
  /** Diagnostisch: welke FTS-top is afgewezen door de first-word check?
   *  Wordt door de route gelogd voor Fase-4 evaluatie. */
  rejectedFtsTop?: { nevoCode: number; nameEn: string; score: number };
};

export function stripParens(s: string): string {
  return s.replace(/\(([^)]+)\)/g, '$1').replace(/\s+/g, ' ').trim();
}

// Score per kandidaat. Hoger = beter passend.
//   first-word match (start)        +10
//   first-word match (substring)    +4
//   exact state-woord in naam       +8
//   cooked vs raw categorie match   +6 / mismatch -4
export function scoreHit(hit: SearchHit, cleanedName: string, state?: string): number {
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

function _toMatch(hit: SearchHit) {
  return { nevoCode: hit.nevo_code, nameNl: hit.name_nl, foodGroupNl: hit.food_group_nl };
}

function _toAlt(hit: SearchHit) {
  return { nevoCode: hit.nevo_code, nameNl: hit.name_nl };
}

// Hoofdwoord-vergelijking: het topkandidaat moet hetzelfde eerste woord
// hebben (of een prefix daarvan) als de input. Voorkomt dat 'noodle'
// valt op 'Chinese noodle ball deep-fried'.
function _firstWordAcceptable(inputFirst: string, hitNameEn: string): boolean {
  if (!inputFirst) return false;
  const hitFirst = hitNameEn.toLowerCase().split(/\s+/)[0];
  return (
    hitFirst === inputFirst ||
    hitFirst.startsWith(inputFirst) ||
    inputFirst.startsWith(hitFirst)
  );
}

/**
 * Cascade-IO: probeer FTS, val terug op vector wanneer FTS niet accepteert.
 *
 * Door de fetchers via parameters in te steken kunnen we deze functie
 * volledig unit-testen zonder netwerk. De route handler injecteert
 * `searchFoodsCached` + `searchFoodsByVectorCached` (zie route.ts).
 *
 * Vector-fout = tolerant: dan blijven we bij wat FTS opleverde
 * (source: 'none'). Een tijdelijke Gemini/pgvector-storing mag de hele
 * foto-analyse niet stuk maken.
 */
export async function lookupOne(
  inputName: string,
  state: string | undefined,
  services: {
    searchFts(q: string): Promise<SearchHit[]>;
    searchVec(q: string): Promise<VectorHit[]>;
  },
): Promise<MatchResult> {
  const ftsHits = await services.searchFts(stripParens(inputName));
  const ftsOnly = pickMatch(inputName, state, ftsHits, []);
  if (ftsOnly.source === 'fts') return ftsOnly;

  let vectorHits: VectorHit[] = [];
  try {
    vectorHits = await services.searchVec(inputName);
  } catch (err) {
    // Eén log per fail — niet per item — om niet te spammen wanneer
    // de hele service down is. Caller telt dit elders.
    console.warn('[nevo/match] vector lookup failed for', inputName, err);
  }
  return pickMatch(inputName, state, ftsHits, vectorHits);
}

export function pickMatch(
  inputName: string,
  state: string | undefined,
  ftsHits: SearchHit[],
  vectorHits: VectorHit[],
): MatchResult {
  const cleaned = stripParens(inputName).toLowerCase();
  const firstWord = cleaned.split(/[\s,-]+/)[0] ?? '';

  // ── 1. FTS-pad ───────────────────────────────────────────────────────
  let ftsRanked: { hit: SearchHit; score: number }[] = [];
  let rejectedFtsTop: MatchResult['rejectedFtsTop'] | undefined;

  if (ftsHits.length) {
    ftsRanked = ftsHits
      .map((h) => ({ hit: h, score: scoreHit(h, cleaned, state) }))
      .sort((a, b) => b.score - a.score);

    const top = ftsRanked[0];
    if (_firstWordAcceptable(firstWord, top.hit.name_en)) {
      // Happy path: FTS accepteert.
      return {
        inputName,
        state,
        match: _toMatch(top.hit),
        alternatives: ftsRanked.slice(1, 4).map((r) => _toAlt(r.hit)),
        source: 'fts',
      };
    }
    // First-word reject — hou top als diagnostiek voor logging in route.
    rejectedFtsTop = {
      nevoCode: top.hit.nevo_code,
      nameEn: top.hit.name_en,
      score: top.score,
    };
  }

  // ── 2. Vector-fallback ───────────────────────────────────────────────
  // Hits die hier binnenkomen zijn al gefilterd door de service op
  // min_similarity=VECTOR_THRESHOLD (zie route). We re-ranken nog wel
  // op state-preferentie zodat "rice raw" niet bij "Rice boiled" valt
  // wanneer beide in de top-5 zitten.
  if (vectorHits.length) {
    const vRanked = vectorHits
      .map((h) => ({ hit: h, score: scoreHit(h, cleaned, state) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tiebreak op similarity (al desc bij binnenkomst).
        return b.hit.similarity - a.hit.similarity;
      });

    const top = vRanked[0];
    return {
      inputName,
      state,
      match: _toMatch(top.hit),
      alternatives: vRanked.slice(1, 4).map((r) => _toAlt(r.hit)),
      source: 'vector',
      rejectedFtsTop,
    };
  }

  // ── 3. Geen match — toon FTS-rejects als suggestie ──────────────────
  // Beter dat de gebruiker in de UI-review iets handmatig kan selecteren
  // dan helemaal blanco; de route stuurt dit in `alternatives`.
  return {
    inputName,
    state,
    match: null,
    alternatives: ftsRanked.slice(0, 4).map((r) => _toAlt(r.hit)),
    source: 'none',
    rejectedFtsTop,
  };
}
