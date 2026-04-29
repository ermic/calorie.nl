// Browser-side fetch-helper voor /api/nevo/match. Types staan inline
// zodat dit bestand niet (per ongeluk) een import-pad aanlegt naar de
// server-only route-handler.

export type MatchedItem = {
  inputName: string;
  state?: string;
  visualHint?: string;
  match: { nevoCode: number; nameNl: string; foodGroupNl: string } | null;
  alternatives: { nevoCode: number; nameNl: string }[];
};

export type RecognizedItem = { name: string; state?: string; visualHint?: string };

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
  const json = (await res.json()) as { items: Omit<MatchedItem, 'visualHint'>[] };
  // Plak visualHint terug aan elk gematcht item zodat de estimate-prompt
  // 'm kan gebruiken — de server-route hoeft hem niet door te geven.
  return json.items.map((m, i) => ({ ...m, visualHint: items[i]?.visualHint }));
}
