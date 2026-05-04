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

// Cosine-similarity drempels. Twee modes:
//
// MATCH (foto-flow, /api/nevo/match): top-1-pick, dus moeten we zeker zijn.
// 0.65 op basis van empirische check fase 1f (relevant ≥ ~0.7, duidelijk
// irrelevant ≤ ~0.55).
//
// TYPEAHEAD (handmatig zoeken, /api/nevo/search): toont een lijst, de
// gebruiker kiest zelf — ruimer suggesteren is OK. 0.60 vangt edge-cases
// als "noedels" → "Mihoen gekookt" (sim 0.648) op die NEVO's NL-naam-
// gat veroorzaakt.
//
// Beide override-baar via env-vars zodat we ze in fase 4 tunen zonder
// redeploy. Server-only gebruik dus géén NEXT_PUBLIC_ prefix.
function _resolveThreshold(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  const v = Number.parseFloat(raw);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : fallback;
}

export const VECTOR_THRESHOLD = _resolveThreshold('NEVO_VECTOR_THRESHOLD', 0.65);
export const VECTOR_THRESHOLD_TYPEAHEAD = _resolveThreshold(
  'NEVO_VECTOR_THRESHOLD_TYPEAHEAD',
  0.6,
);

// Hoeveel vector-kandidaten we ophalen. >5 voegt zelden iets toe en
// kost extra DB-werk per missing FTS-hit.
export const VECTOR_LIMIT = 5;

// Hoeveel FTS-hits we per ingredient ophalen. Default 30 (boven NEVO's
// ~10-default) zodat scoreHit ook genuanceerde varianten als "Chicken
// fillet prepared" kan vinden i.p.v. te kiezen uit de eerste 10
// tsvector-rangs (waar specifieke 'Kipfilet' rijen vaak buiten vallen).
export const FTS_LIMIT = 30;

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
//   hit-eerste-woord = ENIG input-woord    +10
//   hit-eerste-woord prefix-matched        +8
//   input-eerste-woord substring in naam   +4
//   exact state-woord in naam              +8
//   cooked vs raw categorie match          +6 / mismatch -4
//
// "Bidirectioneel": we kijken zowel of de input-tokens het hit-eerste
// woord bevatten ALS andersom. Dit lost word-order-swaps op zoals
// "red onion" ↔ "Onion red raw" (input-token 'onion' = hit-first 'onion').
export function scoreHit(hit: SearchHit, cleanedName: string, state?: string): number {
  const hitName = hit.name_en.toLowerCase();
  const inputWords = cleanedName.split(/[\s,-]+/).filter(Boolean);
  const firstWord = inputWords[0] ?? '';
  let score = 0;

  if (inputWords.length) {
    const hitFirst = hitName.split(/\s+/)[0];
    if (inputWords.includes(hitFirst)) {
      // Hit-eerste-woord komt exact als losse term in input voor.
      score += 10;
    } else if (
      inputWords.some((w) => hitFirst.startsWith(w) || w.startsWith(hitFirst))
    ) {
      // Plurals/prefixen: "onions" startswith "onion"; "noodle" tegen "noodles".
      score += 8;
    } else if (firstWord && hitName.includes(firstWord)) {
      // Zwakste match — input-eerste-woord komt érgens voor in hit.
      score += 4;
    }
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

// Acceptance-gate: minstens één input-token moet matchen op het eerste
// woord van de hit (gelijk, plural-prefix, of vice versa). Voorkomt dat
// 'noodle' valt op 'Chinese noodle ball deep-fried' — daar is hit-first
// 'chinese' en geen input-token komt daarmee overeen.
//
// Door álle input-tokens te checken (ipv alleen de eerste) accepteren
// we ook word-order swaps: "red onion" ↔ hit-first 'onion'.
function _firstWordsCompatible(cleanedInput: string, hitNameEn: string): boolean {
  const inputWords = cleanedInput.split(/[\s,-]+/).filter(Boolean);
  if (!inputWords.length) return false;
  const hitFirst = hitNameEn.toLowerCase().split(/\s+/)[0];
  return inputWords.some(
    (w) => w === hitFirst || hitFirst.startsWith(w) || w.startsWith(hitFirst),
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

  // ── 1. FTS-pad ───────────────────────────────────────────────────────
  let ftsRanked: { hit: SearchHit; score: number }[] = [];
  let rejectedFtsTop: MatchResult['rejectedFtsTop'] | undefined;

  if (ftsHits.length) {
    ftsRanked = ftsHits
      .map((h) => ({ hit: h, score: scoreHit(h, cleaned, state) }))
      .sort((a, b) => {
        // Eerst score (hoger = beter).
        if (b.score !== a.score) return b.score - a.score;
        // Tiebreak 1: exacte naam-match (input == name_en) wint.
        // Voorkomt dat "banana" + state=raw op "Banana bread" valt
        // wanneer "Banana" zelf óók in de hit-pool zit (beide score 10
        // omdat geen van beide een "raw"-token bevat).
        const aExact = a.hit.name_en.toLowerCase() === cleaned ? 1 : 0;
        const bExact = b.hit.name_en.toLowerCase() === cleaned ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        // Tiebreak 2: kortere naam = primaire vorm.
        return a.hit.name_en.length - b.hit.name_en.length;
      });

    const top = ftsRanked[0];
    if (_firstWordsCompatible(cleaned, top.hit.name_en)) {
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
