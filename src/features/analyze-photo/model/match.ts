// Browser-side fetch-helper voor /api/nevo/match. Types staan inline
// zodat dit bestand niet (per ongeluk) een import-pad aanlegt naar de
// server-only route-handler.

export type MatchSource = 'fts' | 'vector' | 'none';

export type MatchedItem = {
  inputName: string;
  state?: string;
  visualHint?: string;
  /** Fractie eetbaar (0..1). Default 1.0 (volledig eetbaar). Voor banaan
   *  met schil ~0.65 etc. Wordt gebruikt om bruto-grams naar netto-grams
   *  te schalen vóór /calculate. */
  edibleFraction?: number;
  match: { nevoCode: number; nameNl: string; foodGroupNl: string } | null;
  alternatives: { nevoCode: number; nameNl: string }[];
  /** Welke tak deed de match — pipeline-log toont dit per ingrediënt. */
  source: MatchSource;
  /** Bij source !== 'fts' soms aanwezig: FTS-top die we afwezen. */
  rejectedFtsTop?: { nevoCode: number; nameEn: string; score: number };
};

export type RecognizedItem = {
  name: string;
  state?: string;
  visualHint?: string;
  edibleFraction?: number;
};

export async function matchIngredients(items: RecognizedItem[]): Promise<MatchedItem[]> {
  const res = await fetch('/api/nevo/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map(({ name, state }) => ({ name, ...(state ? { state } : {}) })),
    }),
  });
  if (!res.ok) {
    if (res.status === 503) throw new Error('NEVO_UNAVAILABLE');
    throw new Error('NEVO_MATCH_FAILED');
  }
  const json = (await res.json()) as { items: Omit<MatchedItem, 'visualHint' | 'edibleFraction'>[] };
  // Plak visualHint + edibleFraction terug aan elk gematcht item zodat de
  // estimate-prompt en de pipeline ze kunnen gebruiken — de server-route
  // hoeft ze niet door te geven (die kent de browser-side state niet).
  return json.items.map((m, i) => ({
    ...m,
    visualHint: items[i]?.visualHint,
    edibleFraction: items[i]?.edibleFraction,
  }));
}
