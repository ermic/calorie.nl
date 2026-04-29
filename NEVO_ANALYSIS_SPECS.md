# NEVO-analyse specs — multi-step photo pipeline

Detail-specificatie voor het vervangen van de huidige single-pass Gemini-analyse ([src/features/analyze-photo/model/analyze.ts](src/features/analyze-photo/model/analyze.ts)) door een meerstaps-pipeline:

1. Gemini herkent **welke** ingrediënten op de foto staan (geen macro's).
2. De `nutrientcontent`-microservice op `127.0.0.1:5555` matcht elk ingrediënt op een `nevo_code`.
3. Gemini bepaalt het **gewicht in gram** per ingrediënt, gegeven de canonical NEVO-namen + foto.
4. De microservice (`POST /calculate`) levert de definitieve macro's en totalen.
5. Het resultaat wordt als `PhotoAnalysis` in de bestaande Redux-flow gestopt.

Volgt FSD-volgorde zoals [AUTH_SPECS.md](AUTH_SPECS.md): `shared → entities → features → app/api`. Eindigt met route-contracten, env-vars, errors en open issues.

---

## 1. Doelen & non-doelen

**Doel**
- Calorie-berekening op basis van een vaste, geverifieerde NEVO-tabel — niet meer Gemini's eigen schatting.
- Gemini wordt alleen ingezet voor wat het écht goed kan: visuele herkenning + portiegrootte schatten.
- Eén user-facing flow blijft hetzelfde: foto → review-stap met items → opslaan.
- Microservice draait op de loopback-interface; API-key staat **server-side** in `.env.local` en raakt de browser nooit.
- Bestaande "macros schalen op quantity-aanpassing"-feature ([feat/scale-macros-on-quantity-change](src/features/add-meal-photo/ui/MealItemEditor.tsx)) blijft 1-op-1 werken — macros zijn lineair per gram, dus geen extra `/calculate`-roundtrip nodig bij elke keystroke.

**Non-doel**
- USDA / Open Food Facts als secundaire bron — out of scope; OFF blijft alleen voor de barcode-flow.
- User-instelbare match-correctie (kiezen uit alternatieven) — V2; voor nu top-1.
- Server-side caching van Gemini-responses — out of scope.
- Migratie van eerder opgeslagen maaltijden (zonder `nevoCode`) — laat bestaande rijen ongewijzigd; `nevoCode` is optioneel veld.

---

## 2. Architectuur

```
                    ┌───────── browser ─────────┐
                    │                           │
  foto ────────►  Gemini call A (recognize)
                    │   ↓ items: [{name}]       │
                    │                           │
                    ├──► POST /api/nevo/match ──┼──► 127.0.0.1:5555  GET /foods?q=
                    │   ↑ items: [{name, match, alternatives}]
                    │                           │
                  Gemini call B (estimate grams)
                    │   ↓ items: [{nevo_code, grams}]
                    │                           │
                    └──► POST /api/nevo/calculate ┼──► 127.0.0.1:5555  POST /calculate
                        ↑ totals + per-item kcal
                        │
                    PhotoAnalysis  →  redux  →  ReviewStep
```

**Kernkeuze**: alleen NEVO-calls gaan via een Next.js-proxy. Gemini blijft browser-side want de user's eigen API-key staat in `localStorage` (zie [shared/lib/gemini-key-storage.ts](src/shared/lib/gemini-key-storage.ts)) en mag nooit op de server belanden.

Waarom géén alles-in-één server-route? Dan zou de server Gemini moeten aanroepen, en daarmee de user's API-key zien — dat breekt het bestaande beveiligingsmodel.

---

## 3. Datamodel

### 3.1 [src/entities/meal/model/photo-analysis.ts](src/entities/meal/model/photo-analysis.ts) — uitbreiding

Eén veld erbij:

```ts
export type PhotoAnalysisItem = {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nevoCode?: number;        // nieuw — null bij Gemini-only fallback (zie §7)
};
```

`PhotoAnalysis` zelf ongewijzigd. `nevoCode` is optioneel zodat oude maaltijden die zonder microservice zijn gemaakt blijven werken; nieuwe analyses zetten het altijd, behalve bij de fallback.

### 3.2 [src/features/add-meal-photo/model/slice.ts](src/features/add-meal-photo/model/slice.ts) — uitbreiding

`EditableMealItem` (gedefinieerd in [entities/meal/model/types.ts](src/entities/meal/model/types.ts)) krijgt `nevoCode?: number`. `analysisSucceeded` neemt het mee. De save-payload negeert het voor nu (server hoeft niets met `nevoCode` — V2 kan het persisteren voor "macros uit NEVO refresh").

### 3.3 Geen DB-wijzigingen

`Meals` collection blijft zoals-is. `nevoCode` zit alleen in client-state tijdens de wizard; bij save wordt het niet opgeslagen (V1). Reden: vermijdt een Payload-migratie en `nevoCode` heeft pas nut zodra we recalc-on-edit doen tegen `/calculate`, wat in V2 zit.

---

## 4. Shared lib

### 4.1 [src/shared/api/nutrientcontent.ts](src/shared/api/nutrientcontent.ts) (nieuw, server-side)

Thin fetcher rond de microservice. **Niet** importeren in `'use client'`-bestanden — alleen vanuit route-handlers.

```ts
import 'server-only';

const BASE = process.env.NUTRIENTCONTENT_BASE_URL ?? 'http://127.0.0.1:5555';
const KEY = process.env.NUTRIENTCONTENT_API_KEY;

if (!KEY && process.env.NODE_ENV === 'production') {
  throw new Error('NUTRIENTCONTENT_API_KEY missing');
}

export type SearchHit = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  food_group_nl: string;
  food_group_en: string;
};

export async function searchFoods(q: string, opts?: { lang?: 'nl' | 'en'; limit?: number; signal?: AbortSignal }) {
  const url = new URL('/foods', BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('lang', opts?.lang ?? 'nl');
  url.searchParams.set('limit', String(opts?.limit ?? 5));
  const res = await fetch(url, {
    headers: { 'X-API-Key': KEY ?? '' },
    signal: opts?.signal,
    cache: 'no-store',
  });
  if (!res.ok) throw new NutrientContentError(`search failed: ${res.status}`, res.status);
  const json = (await res.json()) as { query: string; results: SearchHit[] };
  return json.results;
}

export type CalcRequestItem = { nevo_code: number; grams: number };
export type CalcTotals = {
  kcal: number; kj: number;
  protein_g: number; fat_g: number; saturated_fat_g: number;
  carbs_g: number; sugar_g: number; fiber_g: number; salt_g: number;
};
export type CalcItemOut = {
  nevo_code: number; name_nl: string; name_en: string;
  grams: number; kcal: number;
};
export type CalcResponse = { totals: CalcTotals; items: CalcItemOut[] };

export async function calculate(items: CalcRequestItem[], opts?: { signal?: AbortSignal }): Promise<CalcResponse> {
  const res = await fetch(new URL('/calculate', BASE), {
    method: 'POST',
    headers: { 'X-API-Key': KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
    signal: opts?.signal,
    cache: 'no-store',
  });
  if (!res.ok) throw new NutrientContentError(`calculate failed: ${res.status}`, res.status);
  return res.json();
}

export class NutrientContentError extends Error {
  constructor(msg: string, public status: number) {
    super(msg);
  }
}
```

**Waarom geen kcal/macros uit `/calculate items[].kcal`?** Per item geeft `/calculate` alleen `kcal`. Voor protein/fat/carbs per item moeten we `/foods/{nevo_code}` apart fetchen óf de totals lineair terug-rekenen. Voor V1 kiezen we de eenvoudige weg: **server-route in `/api/nevo/calculate` voert ook `GET /foods/{nevo_code}` parallel uit per item** zodat de browser direct alle macro's per item krijgt. Zie §6.2.

### 4.2 [src/shared/api/gemini.ts](src/shared/api/gemini.ts) — ongewijzigd

Eén model (`gemini-2.5-flash`), zelfde `getVisionModel(apiKey)`.

---

## 5. Features

### 5.1 [src/features/analyze-photo/model/analyze.ts](src/features/analyze-photo/model/analyze.ts) — herschrijven

Eén bestand bevat beide prompts (constants), beide schema's, beide Gemini-calls én de orchestrator. Public signature van `analyzePhoto(file, apiKey)` blijft gelijk — `useAnalyzePhoto` hoeft niet aangepast.

Skelet:

```ts
import { z } from 'zod';
import { GEMINI_VISION_MODEL, getVisionModel, type GeminiModelName } from '@/shared/api/gemini';
import type { PhotoAnalysis } from '@/entities/meal';
import { matchIngredients, type MatchedItem } from './match';
import { fileToInlineData } from '../lib/image-bytes';

// ─── Prompt 1: ingrediënten herkennen (geen macro's) ──────────────────
const RECOGNIZE_PROMPT = `Je bent een voedingsexpert. Bekijk de foto en identificeer alle zichtbare voedingsmiddelen.

REGELS:
- Geef per item een korte Nederlandse naam, enkelvoud, geschikt voor het opzoeken in een NEVO-tabel.
  GOED: "kipfilet", "rijst", "broccoli"
  FOUT: "stukje gegrilde kipfilet met kruiden en olijfolie"
- Bij bereidingsstaat: zet "rauw" / "bereid" / "gebakken" / "gebraden" in 'state'.
- Geef GEEN macro's of calorieën. Dat doen we apart.
- Geef wel een 'visualHint' over de portiegrootte zoals zichtbaar (bv. "halve schaal", "1 medium", "dunne plak van ~1 cm").
- Confidence (0-1): hoe zeker ben je dat de items en hun namen kloppen.

Antwoord ALLEEN met geldige JSON:
{
  "confidence": 0.85,
  "items": [
    { "name": "kipfilet", "state": "bereid", "visualHint": "1 filet van ~150g" },
    { "name": "rijst", "state": "bereid", "visualHint": "halve borddiameter" }
  ],
  "notes": "Optionele toelichting"
}`;

const RecognizeSchema = z.object({
  confidence: z.number().min(0).max(1),
  items: z.array(z.object({
    name: z.string().min(1),
    state: z.string().optional(),
    visualHint: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
});

// ─── Prompt 2: gewicht per gematcht item ───────────────────────────────
function buildEstimatePrompt(matched: MatchedItem[]): string {
  const list = matched
    .filter((m) => m.match)
    .map((m) =>
      `- nevoCode=${m.match!.nevoCode}, naam="${m.match!.nameNl}"` +
      (m.visualHint ? `, visualHint="${m.visualHint}"` : ''))
    .join('\n');

  return `Bekijk de foto. Schat per onderstaand item het gewicht in gram.
Gebruik visuele referenties (bord ≈25 cm, vork ≈20 cm, hand). Wees realistisch.

Items:
${list}

Antwoord ALLEEN met geldige JSON:
{ "items": [ { "nevoCode": 1392, "grams": 145 }, ... ] }
Eén entry per nevoCode hierboven, geen extra items.`;
}

const EstimateSchema = z.object({
  items: z.array(z.object({
    nevoCode: z.number().int(),
    grams: z.number().positive().max(5000),
  })).min(1),
});

// ─── Gemini-calls ──────────────────────────────────────────────────────
async function recognize(file: File, apiKey: string) {
  const inline = await fileToInlineData(file);
  const result = await getVisionModel(apiKey).generateContent([RECOGNIZE_PROMPT, inline]);
  const text = result.response.text();
  try {
    return RecognizeSchema.parse(JSON.parse(text));
  } catch (err) {
    console.error('Failed to parse recognize-response:', text, err);
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
}

async function estimate(file: File, apiKey: string, matched: MatchedItem[]) {
  const inline = await fileToInlineData(file);
  const result = await getVisionModel(apiKey).generateContent([buildEstimatePrompt(matched), inline]);
  const text = result.response.text();
  try {
    return EstimateSchema.parse(JSON.parse(text));
  } catch (err) {
    console.error('Failed to parse estimate-response:', text, err);
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────
export type AnalyzeResult = { analysis: PhotoAnalysis; model: GeminiModelName };

export async function analyzePhoto(file: File, apiKey: string): Promise<AnalyzeResult> {
  // Stap 1
  const recognized = await recognize(file, apiKey);

  // Stap 2
  const matched = await matchIngredients(recognized.items);
  const matchedWithCode = matched.filter((m) => m.match);
  if (!matchedWithCode.length) throw new Error('NO_NEVO_MATCHES');

  // Stap 3
  const grams = await estimate(file, apiKey, matchedWithCode);

  // Stap 4
  const calcRes = await fetch('/api/nevo/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: grams.items }),
  });
  if (!calcRes.ok) throw new Error('NEVO_CALCULATE_FAILED');
  const calc = await calcRes.json();

  // Stap 5: project naar PhotoAnalysis
  const analysis: PhotoAnalysis = {
    confidence: recognized.confidence,
    notes: recognized.notes,
    items: calc.items.map((it: CalcItem) => ({
      name: it.name_nl,
      estimatedGrams: it.grams,
      calories: it.kcal,
      protein: it.protein_g,
      carbs: it.carbs_g,
      fat: it.fat_g,
      nevoCode: it.nevo_code,
    })),
  };
  return { analysis, model: GEMINI_VISION_MODEL };
}
```

`detectImageType` + `arrayBufferToBase64` verhuizen uit `analyze.ts` naar [src/features/analyze-photo/lib/image-bytes.ts](src/features/analyze-photo/lib/image-bytes.ts), met daar een nieuwe helper `fileToInlineData(file)` die `{ inlineData: { data, mimeType } }` teruggeeft (gebruikt door beide Gemini-calls).

### 5.2 [src/features/analyze-photo/model/match.ts](src/features/analyze-photo/model/match.ts) (nieuw, browser-side)

Thin fetch-helper voor de NEVO-match-route. Niet in `analyze.ts` omdat het geen Gemini-werk is en ook standalone testbaar moet zijn.

```ts
export type MatchedItem = {
  inputName: string;
  state?: string;
  visualHint?: string;
  match: { nevoCode: number; nameNl: string; foodGroupNl: string } | null;
  alternatives: { nevoCode: number; nameNl: string }[];
};

export async function matchIngredients(
  items: { name: string; state?: string; visualHint?: string }[],
): Promise<MatchedItem[]> {
  const res = await fetch('/api/nevo/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: items.map(({ name, state }) => ({ name, state })) }),
  });
  if (!res.ok) throw new Error('NEVO_MATCH_FAILED');
  const json = (await res.json()) as { items: MatchedItem[] };
  // Plak visualHint terug aan elke MatchedItem zodat estimate-prompt 'm kan gebruiken.
  return json.items.map((m, i) => ({ ...m, visualHint: items[i]?.visualHint }));
}
```

---

## 6. App / API-routes

Beide nieuwe routes onder [src/app/api/nevo/](src/app/api/nevo/). Allebei `runtime = 'nodejs'` (server-only fetch + env-vars). Allebei achter Payload-session (`payload.auth({ headers })`) — zelfde patroon als [foods/search/route.ts](src/app/api/foods/search/route.ts).

### 6.1 `POST /api/nevo/match`

| Veld | Type |
| --- | --- |
| Request body | `{ items: [{ name: string; state?: string }] }` (max 20 items, validate met zod) |
| Response 200 | `{ items: [{ inputName, state?, match, alternatives }] }` |
| Response 401 | `{ error: 'Niet ingelogd' }` |
| Response 503 | `{ error: 'NEVO_UNAVAILABLE' }` als microservice unreachable |

Implementatie:

```ts
export async function POST(req: NextRequest) {
  const { user } = await getPayload().then(p => p.auth({ headers: await nextHeaders() }));
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const body = MatchRequestSchema.parse(await req.json());

  // n parallelle searches (max 20). State wordt aangehangen aan de query
  // ("kipfilet bereid") — NEVO heeft state-aware entries als "Kipfilet bereid".
  const lookups = body.items.map(async ({ name, state }) => {
    const q = state ? `${name} ${state}` : name;
    try {
      const hits = await searchFoods(q, { limit: 5 });
      return {
        inputName: name,
        state,
        match: hits[0] ? toMatch(hits[0]) : null,
        alternatives: hits.slice(1, 4).map(toMatch),
      };
    } catch (err) {
      // Eén faalde search ≠ hele response stuk; markeer als geen-match
      console.warn('[match] search failed for', name, err);
      return { inputName: name, state, match: null, alternatives: [] };
    }
  });

  const items = await Promise.all(lookups);
  return NextResponse.json({ items });
}
```

### 6.2 `POST /api/nevo/calculate`

| Veld | Type |
| --- | --- |
| Request body | `{ items: [{ nevoCode: number; grams: number }] }` (max 50, mirror van microservice-limiet) |
| Response 200 | `{ totals: CalcTotals; items: [{ nevo_code, name_nl, grams, kcal, protein_g, carbs_g, fat_g }] }` |
| Response 401 | `{ error: 'Niet ingelogd' }` |
| Response 422 | proxy van microservice-422 |
| Response 503 | `{ error: 'NEVO_UNAVAILABLE' }` |

Implementatie:

```ts
export async function POST(req: NextRequest) {
  // …auth-guard zelfde als 6.1

  const body = CalcRequestSchema.parse(await req.json());

  // /calculate geeft per item alleen kcal. Voor protein/fat/carbs per item
  // halen we /foods/{code} parallel op en rekenen lineair om naar grams.
  const [calc, foods] = await Promise.all([
    nutrientcontent.calculate(body.items.map(i => ({ nevo_code: i.nevoCode, grams: i.grams }))),
    Promise.all(body.items.map(i => fetchFoodDetail(i.nevoCode))),
  ]);

  const detailByCode = new Map(foods.map(f => [f.nevo_code, f]));
  const items = calc.items.map((it) => {
    const detail = detailByCode.get(it.nevo_code);
    const macros = extractMacrosPer100(detail);  // helper, plukt PROT/FAT/CHO uit nutrients[]
    const factor = it.grams / 100;
    return {
      nevo_code: it.nevo_code,
      name_nl: it.name_nl,
      grams: it.grams,
      kcal: it.kcal,
      protein_g: round1(macros.protein * factor),
      carbs_g: round1(macros.carbs * factor),
      fat_g: round1(macros.fat * factor),
    };
  });

  return NextResponse.json({ totals: calc.totals, items });
}
```

`extractMacrosPer100` plukt nutrient-codes uit `FoodDetail.nutrients[]`. NEVO-codes:
- `PROT` — eiwit (g/100g)
- `FAT` — vet (g/100g)
- `CHO` — koolhydraten (g/100g)

(Te verifiëren tegen `GET /foods/1` zodra we kunnen testen — alternatieve labels: `protein`, `fat`, `carbohydrates`. Zie open issue #1.)

`fetchFoodDetail` voegen we toe aan [src/shared/api/nutrientcontent.ts](src/shared/api/nutrientcontent.ts) — proxies `GET /foods/{nevo_code}`.

### 6.3 In-memory cache (optioneel V1)

`searchFoods` op server-side krijgt een Map-LRU (max 200 entries, TTL 10 min) op `(q, lang)` zodat dezelfde "kipfilet" niet bij elke foto-analyse opnieuw de DB raakt. `fetchFoodDetail` idem op `nevo_code`. Beide met `cache-control: no-store` op de fetch zelf — caching is in-process, niet edge.

---

## 7. Errors & fallbacks

| Situatie | Gedrag |
| --- | --- |
| Gemini key ontbreekt | `GEMINI_API_KEY_MISSING` (huidig gedrag — UI redirect naar profiel). |
| Gemini-call A parse-fout | Throw `AI-analyse gaf geen geldig resultaat. Probeer een andere foto.` (huidig gedrag). |
| Microservice unreachable (`/api/nevo/match` of `/calculate` → 503) | UI toont melding "NEVO is even niet bereikbaar — probeer later opnieuw". **Geen** automatische fallback naar Gemini-only meer; dat zou het hele doel van deze refactor ondermijnen. |
| 0 items met NEVO-match | `NO_NEVO_MATCHES` → UI: "Niets herkend in de NEVO-tabel. Probeer een andere foto." |
| Sommige items matchen wél | Continue met de gematchte items; toon in review-stap een hint dat N items zijn weggevallen. |
| Gemini-call B parse-fout | Zelfde als call A — error toast. |
| `/calculate` 422 | Een ongeldige `nevo_code` of grams. Drop het item, recalc met de rest, log warning. |
| Microservice down maar `/health` ok eerder | Health-probe doen we **niet** — eerste foute call telt als 503. |

---

## 8. Env-vars

In `.env.local` (en `.env.example` met dummy):

```bash
# nutrientcontent microservice (lokaal, loopback-only)
NUTRIENTCONTENT_BASE_URL=http://127.0.0.1:5555
NUTRIENTCONTENT_API_KEY=<zelfde waarde als /home/erik/microservices/nutrientcontent/.env API_KEY>
```

**Niet `NEXT_PUBLIC_*`** — deze key mag de browser nooit zien. Server-routes lezen het via `process.env`.

---

## 9. Tests

### 9.1 Unit (Vitest of node:test, naar bestaand patroon)

| Wat | Hoe |
| --- | --- |
| `RecognizeSchema` parse | happy path + minstens 1 missende field → throw |
| `EstimateSchema` parse | idem |
| `extractMacrosPer100` | mock `FoodDetail.nutrients[]` met PROT/FAT/CHO + ontbrekend → 0 |
| `pipeline` happy path | mock `recognizeFromPhoto`, fetch-mock voor `/api/nevo/*` → assert PhotoAnalysis-shape |
| `pipeline` met unmatched item | 1 match, 1 null → result heeft 1 item |
| `pipeline` met 0 matches | throws `NO_NEVO_MATCHES` |

### 9.2 E2e (Playwright)

| Scenario | Mock |
| --- | --- |
| Foto uploaden → review-stap | mock Gemini SDK in browser-context; fetch-intercept voor `/api/nevo/*` |
| Microservice down | intercept `/api/nevo/match` → 503; verwacht foutmelding-toast |
| Eén item matcht niet | match-response heeft `match: null` voor item 2; review-stap toont 1 item + waarschuwing |

Live tests tegen de echte microservice (lokaal) kan in een aparte `pnpm test:integration` script — niet in CI.

---

## 10. Implementatie-volgorde

1. **Branch** — `feat/nevo-microservice-analysis` (✅ aangemaakt vanaf `main`).
2. **Env** — `.env.local` aanvullen met `NUTRIENTCONTENT_*`. `.env.example` mee.
3. **Shared fetcher** — [src/shared/api/nutrientcontent.ts](src/shared/api/nutrientcontent.ts) met `searchFoods`, `fetchFoodDetail`, `calculate`, `NutrientContentError`. Type-only run (`pnpm exec tsc --noEmit`).
4. **API-routes** — `/api/nevo/match` + `/api/nevo/calculate` + zod-schemas. Curl-test handmatig tegen draaiende microservice.
5. **Image-bytes util** — verhuis `detectImageType` + `arrayBufferToBase64` uit `analyze.ts` naar [src/features/analyze-photo/lib/image-bytes.ts](src/features/analyze-photo/lib/image-bytes.ts) en voeg `fileToInlineData(file)` toe.
6. **Match-helper** — [match.ts](src/features/analyze-photo/model/match.ts) + unit-test.
7. **`analyze.ts` herschrijven** — beide prompts (`RECOGNIZE_PROMPT` + `buildEstimatePrompt`), beide schemas, beide Gemini-calls, en de orchestrator. Oude single-pass `SYSTEM_PROMPT` + `AnalysisSchema` verwijderen.
8. **Types** — `PhotoAnalysisItem.nevoCode` + `EditableMealItem.nevoCode` toevoegen.
9. **Manual smoke** — start dev-server (`pnpm dev`), upload foto van een eenvoudige maaltijd, verifieer dat review-stap items met realistische macro's toont.
10. **Tests** — unit-suite groen.
11. **Commit + PR** naar `main`.

---

## 11. Open issues / beslissingen

1. **NEVO nutrient-codes** — bevestigd via `GET /foods/1392`: `PROT` (Eiwit totaal, g/100g), `FAT` (Vet totaal, g/100g), `CHO` (Koolhydraten beschikbaar, g/100g). Voor kcal/kJ zijn er ook `ENERCC` en `ENERCJ` beschikbaar — niet nodig want `/calculate` levert kcal/kJ al op item-niveau.
2. **Top-1 vs alternatieven in review-UI** — V1 toont alleen top-1 (achterliggende `EditableMealItem.name = match.nameNl`). Alternatieven zijn al beschikbaar in de match-response → V2 kan een dropdown "wijzig match" tonen die `/calculate` opnieuw triggert.
3. **Rounding** — kcal komt al afgerond uit microservice; protein/fat/carbs ronden we af op 1 decimaal in de proxy-route. `analysisSucceeded`-reducer (zie [slice.ts:33](src/features/add-meal-photo/model/slice.ts#L33)) rondt alsnog af op heel getal. Of we 1 decimaal willen tonen in review = UI-keuze, niet structureel.
4. **Latency** — pipeline = 2 Gemini-calls (~1-2s elk) + N searches parallel + 1 calculate ≈ 3-5s totaal. Acceptabel voor V1; toon spinner met "Bezig met analyseren…" tekst (huidig). V2 kan call B starten zodra match-response binnen is en niet wachten op laatste search (kleine winst).
5. **Confidence-score** — recognized.confidence wordt 1-op-1 doorgegeven. Een "match-confidence" (hoeveel items matchten?) zou hier nog bijkomen, maar V1 niet expliciet exposen.
6. **Server-side cache** — Map-LRU is voldoende voor V1; als de service ooit verhuist naar een ander host wordt het een Redis-job.
7. **Macros-on-quantity scaling** — feature uit `feat/scale-macros-on-quantity-change` blijft werken: macros zijn lineair per gram dus `quantity * (storedMacro / pivotQuantity)` geeft de juiste waarde, ongeacht bron. Géén `/calculate`-roundtrip per keystroke.
