import { describe, expect, it } from 'vitest';

import type { SearchHit, VectorHit } from '@/shared/api/nutrientcontent';

import {
  lookupOne,
  pickMatch,
  scoreHit,
  stripParens,
  VECTOR_THRESHOLD,
  VECTOR_THRESHOLD_TYPEAHEAD,
} from './lookup';

// ─── Test-helpers ──────────────────────────────────────────────────────


function _hit(over: Partial<SearchHit> = {}): SearchHit {
  return {
    nevo_code: 1,
    name_nl: 'Aardappelen rauw',
    name_en: 'Potatoes raw',
    food_group_nl: 'Aardappelen',
    food_group_en: 'Potatoes',
    ...over,
  };
}

function _vhit(over: Partial<VectorHit> = {}): VectorHit {
  return { ..._hit(over), similarity: 0.8, ...over };
}

// ─── stripParens ───────────────────────────────────────────────────────


describe('stripParens', () => {
  it('keeps content of parens, drops the parens themselves', () => {
    expect(stripParens('rice (cooked)')).toBe('rice cooked');
    expect(stripParens('(red) pepper')).toBe('red pepper');
  });

  it('collapses extra whitespace', () => {
    expect(stripParens('  hello   world  ')).toBe('hello world');
  });
});

// ─── scoreHit ──────────────────────────────────────────────────────────


describe('scoreHit', () => {
  it('rewards exact first-word match', () => {
    const exact = scoreHit(_hit({ name_en: 'Rice white raw' }), 'rice', undefined);
    const partial = scoreHit(_hit({ name_en: 'Bowl of rice' }), 'rice', undefined);
    expect(exact).toBeGreaterThan(partial);
  });

  it('rewards plurals via startsWith on either side', () => {
    expect(scoreHit(_hit({ name_en: 'Onions boiled' }), 'onion', undefined)).toBeGreaterThanOrEqual(8);
    expect(scoreHit(_hit({ name_en: 'Onion raw' }), 'onions', undefined)).toBeGreaterThanOrEqual(8);
  });

  it('penalizes raw when caller wants cooked', () => {
    const cooked = scoreHit(_hit({ name_en: 'Chicken cooked' }), 'chicken', 'cooked');
    const raw = scoreHit(_hit({ name_en: 'Chicken raw' }), 'chicken', 'cooked');
    expect(cooked).toBeGreaterThan(raw);
  });

  it('rewards state word appearing literally in name', () => {
    const grilled = scoreHit(_hit({ name_en: 'Chicken grilled' }), 'chicken', 'grilled');
    const cooked = scoreHit(_hit({ name_en: 'Chicken cooked' }), 'chicken', 'grilled');
    expect(grilled).toBeGreaterThan(cooked);
  });

  // Word-order swap: "red onion" vs "Onion red raw". Het hoofdwoord van de
  // hit ('onion') komt voor als losse term in de input — vroeger gaf dat
  // alleen +4 (substring), nu zou het hetzelfde moeten zijn als hit_first
  // matched op input_first.
  it('rewards modifier-noun word order swap as fully as direct match', () => {
    const swapped = scoreHit(_hit({ name_en: 'Onion red raw' }), 'red onion', 'raw');
    const direct = scoreHit(_hit({ name_en: 'Onion raw' }), 'onion', 'raw');
    expect(swapped).toBeGreaterThanOrEqual(direct);
  });
});

// ─── pickMatch — FTS-only paden ────────────────────────────────────────


describe('pickMatch — FTS hit accepted', () => {
  it('returns top FTS result with source=fts', () => {
    const fts: SearchHit[] = [
      _hit({ nevo_code: 658, name_en: 'Rice white boiled', name_nl: 'Rijst witte gekookt' }),
      _hit({ nevo_code: 1014, name_en: 'Rice brown boiled', name_nl: 'Rijst zilvervlies- gekookt' }),
    ];
    const out = pickMatch('rice', 'boiled', fts, []);
    expect(out.source).toBe('fts');
    expect(out.match?.nevoCode).toBe(658);
    expect(out.alternatives.map((a) => a.nevoCode)).toContain(1014);
  });

  it('does not consult vectorHits when FTS already accepts', () => {
    const fts: SearchHit[] = [
      _hit({ nevo_code: 658, name_en: 'Rice white boiled', name_nl: 'Rijst witte gekookt' }),
    ];
    const vec: VectorHit[] = [
      _vhit({ nevo_code: 9999, name_en: 'Pasta', similarity: 0.99 }),
    ];
    const out = pickMatch('rice', 'boiled', fts, vec);
    expect(out.source).toBe('fts');
    expect(out.match?.nevoCode).toBe(658);
  });
});

// ─── pickMatch — FTS reject → vector fallback ──────────────────────────


describe('pickMatch — FTS hits rejected (word soup)', () => {
  it('falls back to vector when first-word check rejects FTS top', () => {
    // 'noodle' query, FTS topkandidaat heeft 'noodle' niet als hoofdwoord.
    const fts: SearchHit[] = [
      _hit({ nevo_code: 1, name_en: 'Chinese noodle ball deep-fried', name_nl: 'Krokante bal' }),
    ];
    const vec: VectorHit[] = [
      _vhit({
        nevo_code: 5000,
        name_en: 'Noodles wheat boiled',
        name_nl: 'Mie tarwe gekookt',
        similarity: 0.82,
      }),
    ];
    const out = pickMatch('noodle', undefined, fts, vec);
    expect(out.source).toBe('vector');
    expect(out.match?.nevoCode).toBe(5000);
    expect(out.rejectedFtsTop?.nevoCode).toBe(1);
  });

  it('exposes FTS rejects in alternatives when vector has nothing', () => {
    const fts: SearchHit[] = [
      _hit({ nevo_code: 1, name_en: 'Chinese noodle ball deep-fried', name_nl: 'Bal' }),
    ];
    const out = pickMatch('noodle', undefined, fts, []);
    expect(out.source).toBe('none');
    expect(out.match).toBeNull();
    // Gebruiker kan deze alsnog zien als suggestie in de UI-review.
    expect(out.alternatives.map((a) => a.nevoCode)).toContain(1);
  });
});

// Regressie van een echte productie-case: "red onion" + state="raw" → FTS
// vond "Onion red raw" (NEVO 5459) maar werd afgewezen door de strict-
// startsWith first-word check. Vector ving het op, maar dat is overhead;
// de FTS-top was al goed.
// Productie-regressie 2026-05-04: foto van een banaan werd gematcht op
// NEVO 5255 "Bananenbrood" (596 kcal/200g) i.p.v. NEVO 151 "Banaan"
// (88 kcal/100g). Beide kandidaten scoren +10 op first-word, en omdat
// "Banana" geen "raw"-woord in name_en heeft krijgt 'Banaan' geen state-
// bonus. Sort-tie → eerste FTS-resultaat won.
describe('pickMatch — tiebreak op primaire vorm bij gelijke score', () => {
  it('prefers "Banana" over "Banana bread" when state=raw and both score equally', () => {
    const fts: SearchHit[] = [
      // Volgorde uit echte FTS-output: bread komt EERST (hogere ts_rank)
      _hit({ nevo_code: 5255, name_en: 'Banana bread', name_nl: 'Bananenbrood' }),
      _hit({ nevo_code: 151, name_en: 'Banana', name_nl: 'Banaan' }),
      _hit({
        nevo_code: 2394,
        name_en: 'Eclair filled w banana and whipped cream',
        name_nl: 'Soes bananen-',
      }),
      _hit({ nevo_code: 2430, name_en: 'Fritter banana', name_nl: 'Beignet banaan-' }),
    ];
    const out = pickMatch('banana', 'raw', fts, []);
    expect(out.source).toBe('fts');
    expect(out.match?.nevoCode).toBe(151);
  });

  it('prefers exact name match over longer variants', () => {
    // Beide first-word match, scores tied → exact-match wint over alleen-prefix.
    const fts: SearchHit[] = [
      _hit({ nevo_code: 1, name_en: 'Apple turnover baked', name_nl: 'Appelflap' }),
      _hit({ nevo_code: 2, name_en: 'Apple', name_nl: 'Appel' }),
    ];
    const out = pickMatch('apple', 'raw', fts, []);
    expect(out.match?.nevoCode).toBe(2);
  });

  it('keeps state-aware ordering: longer name with matching state still wins', () => {
    // Tiebreak mag scoreHit's state-bonus NIET overrulen.
    const fts: SearchHit[] = [
      _hit({ nevo_code: 1, name_en: 'Rice white', name_nl: 'Rijst' }),  // geen state-info
      _hit({ nevo_code: 2, name_en: 'Rice white boiled', name_nl: 'Rijst gekookt' }),
    ];
    const out = pickMatch('rice', 'boiled', fts, []);
    expect(out.match?.nevoCode).toBe(2); // gekookt wint dankzij state-bonus
  });
});

describe('pickMatch — modifier-noun word order swap', () => {
  it('accepts FTS top when input and hit have swapped first/last words', () => {
    const fts: SearchHit[] = [
      _hit({ nevo_code: 5459, name_en: 'Onion red raw', name_nl: 'Ui rode rauw' }),
    ];
    const out = pickMatch('red onion', 'raw', fts, []);
    expect(out.source).toBe('fts');
    expect(out.match?.nevoCode).toBe(5459);
  });

  it('also accepts "white rice" → "Rice white boiled"', () => {
    const fts: SearchHit[] = [
      _hit({ nevo_code: 658, name_en: 'Rice white boiled', name_nl: 'Rijst witte gekookt' }),
    ];
    const out = pickMatch('white rice', 'boiled', fts, []);
    expect(out.source).toBe('fts');
    expect(out.match?.nevoCode).toBe(658);
  });

  it('still REJECTS noodle vs Chinese noodle ball (regression of original guard)', () => {
    // De oude guard was bewust streng: voorkomen dat één-woord queries
    // op willekeurige word-soup vallen. Die werking moet behouden.
    const fts: SearchHit[] = [
      _hit({ nevo_code: 1, name_en: 'Chinese noodle ball deep-fried', name_nl: 'Bal' }),
    ];
    const out = pickMatch('noodle', undefined, fts, []);
    expect(out.source).toBe('none');
    expect(out.match).toBeNull();
  });
});

// ─── pickMatch — FTS leeg → vector fallback ────────────────────────────


describe('pickMatch — FTS empty', () => {
  it('uses vector top-1 with source=vector when above threshold', () => {
    const vec: VectorHit[] = [
      _vhit({ nevo_code: 100, name_en: 'Minced beef raw', similarity: 0.79 }),
      _vhit({ nevo_code: 101, name_en: 'Minced pork raw', similarity: 0.71 }),
    ];
    const out = pickMatch('minced beef', 'raw', [], vec);
    expect(out.source).toBe('vector');
    expect(out.match?.nevoCode).toBe(100);
    expect(out.alternatives.map((a) => a.nevoCode)).toContain(101);
  });

  it('returns source=none when both FTS and vector are empty', () => {
    const out = pickMatch('xyzzy', undefined, [], []);
    expect(out.source).toBe('none');
    expect(out.match).toBeNull();
    expect(out.alternatives).toEqual([]);
  });
});

// ─── pickMatch — vector re-ranking on state ────────────────────────────


describe('pickMatch — state-aware re-rank op vector hits', () => {
  it('prefers raw when caller asks raw, even if cooked has higher similarity', () => {
    const vec: VectorHit[] = [
      _vhit({ nevo_code: 1, name_en: 'Rice white boiled', similarity: 0.92 }),
      _vhit({ nevo_code: 2, name_en: 'Rice white raw', similarity: 0.85 }),
    ];
    const out = pickMatch('rice', 'raw', [], vec);
    expect(out.source).toBe('vector');
    expect(out.match?.nevoCode).toBe(2);
  });
});

// ─── pickMatch — threshold afspraak ────────────────────────────────────


describe('pickMatch — threshold contract', () => {
  it('VECTOR_THRESHOLD is 0.65 zodat caller dezelfde waarde naar /foods/vector stuurt', () => {
    // Caller stuurt min_similarity=VECTOR_THRESHOLD; alles wat hier
    // binnenkomt is dus al boven die threshold. pickMatch zelf hoeft niet
    // te filteren — maar de constante moet wél consistent zijn.
    expect(VECTOR_THRESHOLD).toBe(0.65);
  });

  it('VECTOR_THRESHOLD_TYPEAHEAD is 0.60 (lager dan match) voor typeahead-suggesties', () => {
    // Typeahead toont een lijst — de gebruiker kiest, dus we mogen ruimer
    // suggesteren. Match-flow pakt zelf de top-1 en moet zekerder zijn.
    expect(VECTOR_THRESHOLD_TYPEAHEAD).toBe(0.6);
    expect(VECTOR_THRESHOLD_TYPEAHEAD).toBeLessThan(VECTOR_THRESHOLD);
  });
});

// ─── lookupOne — cascade IO ────────────────────────────────────────────


describe('lookupOne', () => {
  it('happy FTS path does not call vector', async () => {
    const ftsCalls: string[] = [];
    const vecCalls: string[] = [];
    const services = {
      searchFts: async (q: string) => {
        ftsCalls.push(q);
        return [_hit({ nevo_code: 658, name_en: 'Rice white boiled', name_nl: 'Rijst witte gekookt' })];
      },
      searchVec: async (q: string) => {
        vecCalls.push(q);
        return [];
      },
    };
    const out = await lookupOne('rice', 'boiled', services);
    expect(out.source).toBe('fts');
    expect(ftsCalls).toEqual(['rice']); // stripParens identity hier
    expect(vecCalls).toEqual([]); // vector niet aangeroepen
  });

  it('falls through to vector when FTS reject by first-word', async () => {
    const services = {
      searchFts: async () => [_hit({ nevo_code: 1, name_en: 'Chinese noodle ball deep-fried', name_nl: 'Bal' })],
      searchVec: async () => [
        _vhit({ nevo_code: 5000, name_en: 'Noodles wheat boiled', similarity: 0.82 }),
      ],
    };
    const out = await lookupOne('noodle', undefined, services);
    expect(out.source).toBe('vector');
    expect(out.match?.nevoCode).toBe(5000);
  });

  it('falls through to vector when FTS empty', async () => {
    const services = {
      searchFts: async () => [],
      searchVec: async () => [_vhit({ nevo_code: 100, name_en: 'Minced beef raw', similarity: 0.79 })],
    };
    const out = await lookupOne('minced beef', 'raw', services);
    expect(out.source).toBe('vector');
    expect(out.match?.nevoCode).toBe(100);
  });

  it('tolerates vector failure: returns source=none, no throw', async () => {
    const services = {
      searchFts: async () => [],
      searchVec: async () => {
        throw new Error('simulated 503');
      },
    };
    const out = await lookupOne('xyz', undefined, services);
    expect(out.source).toBe('none');
    expect(out.match).toBeNull();
  });

  it('strips parens before passing q to FTS', async () => {
    const ftsCalls: string[] = [];
    const services = {
      searchFts: async (q: string) => {
        ftsCalls.push(q);
        return [];
      },
      searchVec: async () => [],
    };
    await lookupOne('rice (cooked)', undefined, services);
    expect(ftsCalls[0]).toBe('rice cooked');
  });
});
