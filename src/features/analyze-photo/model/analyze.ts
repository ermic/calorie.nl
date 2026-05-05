import { z } from 'zod';
import { getVisionModel, type ActiveVisionModel, type GeminiModelName } from '@/shared/api/gemini';
import { MEAL_TITLE_MAX_LENGTH, type PhotoAnalysis } from '@/entities/meal';
import { fileToInlineData, type InlineImage } from '../lib/image-bytes';
import { matchIngredients, type MatchedItem } from './match';

const GEMINI_PARSE_ERROR_MESSAGE = 'AI-analyse gaf geen geldig resultaat. Probeer een andere foto.';

// ─── Logger ────────────────────────────────────────────────────────────
export type PipelineLogEntry = {
  timeStamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
};

export type PipelineLogger = (entry: Omit<PipelineLogEntry, 'timeStamp'>) => void;

const NOOP_LOGGER: PipelineLogger = () => {};

// ─── Prompt 1: ingrediënten herkennen (geen macro's) ──────────────────
//
// Output is in HET ENGELS — de NEVO-tabel heeft per ingredient een
// Nederlandse en Engelse naam, en de Engelse vocabulaire is consistenter
// (bv. "Onions boiled" vs. afgekorte NL-namen als "Ui gekookt"). De
// estimate-stap en UI tonen daarna gewoon de Nederlandse NEVO-naam.
const RECOGNIZE_PROMPT = `Je bent een voedingsexpert. Bekijk de foto en identificeer alle zichtbare voedingsmiddelen.

REGELS:
- Geef per item het 'searchName' in HET ENGELS, kort, enkelvoud, geschikt om de NEVO-tabel mee te doorzoeken.
  GOED: "chicken fillet", "rice", "onion", "noodles", "minced beef", "bell pepper red"
  FOUT: "small piece of grilled chicken with spices"
- Bij bereidingsstaat: zet één Engels woord in 'state':
  "raw" | "boiled" | "cooked" | "fried" | "prepared" | "roasted" | "grilled" | "baked" | "stewed" | "steamed" | "poached" | "smoked"
- Geef GEEN macro's of calorieën — dat doen we later via de NEVO-database.
- Geef wel een Nederlandse 'visualHint' over de portiegrootte zoals zichtbaar (bv. "halve schaal", "1 medium", "dunne plak van ~1 cm").
- 'confidence' (0-1): hoe zeker ben je dat de items en namen kloppen.
- Bij producten met een NIET-EETBARE schil/pit/kern die zichtbaar is op de foto, geef 'edibleFraction' (0..1): de fractie van het bruto-gewicht dat eetbaar vlees is. Laat het veld weg of zet 1.0 wanneer alles eetbaar is (gepelde banaan, sla, kipfilet). Richtwaardes:
  banaan met schil ~0.65, sinaasappel/mandarijn ~0.70, citroen/limoen ~0.60, ananas met schil+kern ~0.50, mango met pit ~0.65, avocado met pit+schil ~0.70, watermeloen met schil ~0.55, kiwi met vel ~0.85, granaatappel ~0.55, passievrucht ~0.40.
- Geef ook een korte Nederlandse 'title' van max 60 tekens die de maaltijd als geheel beschrijft, zonder hoofdletters voor elk woord en zonder afsluitende punt. Gebruik herkenbare gerecht-naam als die duidelijk is, anders een opsomming van de hoofdcomponenten.
  GOED: "kipfilet met rijst en wokgroenten", "spaghetti bolognese", "ongepelde banaan", "boterham met kaas"
  FOUT: "Maaltijd met diverse ingrediënten", "Foto van eten", "Lunch."

Antwoord ALLEEN met geldige JSON:
{
  "title": "kipfilet met rijst en wokgroenten",
  "confidence": 0.85,
  "items": [
    { "searchName": "chicken fillet", "state": "prepared", "visualHint": "1 filet van ~150g" },
    { "searchName": "rice", "state": "boiled", "visualHint": "halve borddiameter" },
    { "searchName": "banana", "state": "raw", "visualHint": "1 ongepelde banaan op weegschaal", "edibleFraction": 0.65 }
  ],
  "notes": "Optionele toelichting"
}`;

const RecognizeSchema = z.object({
  // Korte NL-titel die de maaltijd samenvat. Optioneel: oudere prompts of
  // model-fallbacks kunnen 'm weglaten — dan toont de UI gewoon het
  // mealType-label. Bewust géén min/max-cap: een te lange of lege titel
  // mag de hele analyse niet laten falen op een sierveld. We truncaten
  // downstream tot MEAL_TITLE_MAX_LENGTH; de save-route handhaaft de
  // hard cap aan de security-boundary.
  title: z.string().optional(),
  confidence: z.number().min(0).max(1),
  items: z
    .array(
      z.object({
        searchName: z.string().min(1),
        state: z.string().optional(),
        visualHint: z.string().optional(),
        edibleFraction: z.number().min(0).max(1).optional(),
      }),
    )
    .min(1),
  notes: z.string().optional(),
});

type RecognizeResult = z.infer<typeof RecognizeSchema>;

// ─── Prompt 2: gewicht (+ macro's voor niet-gematchte items) ──────────
//
// Voor items met NEVO-code vragen we alléén het gewicht — macro's komen
// straks van /calculate. Voor items zonder match laat Gemini het hele
// blok schatten (gewicht + macro's voor de portie), zodat ze niet uit
// het overzicht verdwijnen.
function buildEstimatePrompt(matched: MatchedItem[], unmatched: MatchedItem[]): string {
  const sections: string[] = [];

  if (matched.length) {
    const matchedList = matched
      .map(
        (m) =>
          `- nevoCode=${m.match!.nevoCode}, naam="${m.match!.nameNl}"` +
          (m.visualHint ? `, visualHint="${m.visualHint}"` : ''),
      )
      .join('\n');
    sections.push(`Items MET NEVO-code (geef alleen gewicht):
${matchedList}`);
  }

  if (unmatched.length) {
    const unmatchedList = unmatched
      .map(
        (m) =>
          `- searchName="${m.inputName}"` +
          (m.state ? ` (${m.state})` : '') +
          (m.visualHint ? `, visualHint="${m.visualHint}"` : ''),
      )
      .join('\n');
    sections.push(`Items ZONDER NEVO-code (geef gewicht én macro's voor de hele portie, niet per 100g):
${unmatchedList}`);
  }

  return `Bekijk de foto. Schat per onderstaand item het gewicht in gram en (waar gevraagd) de macro's voor de hele portie.
Gebruik visuele referenties (bord ≈25 cm, vork ≈20 cm, hand). Wees realistisch.

${sections.join('\n\n')}

Antwoord ALLEEN met geldige JSON:
{
  "matched": [ { "nevoCode": 1392, "grams": 145 } ],
  "unmatched": [
    { "searchName": "udon noodle", "nameNl": "Udon noedels bereid", "grams": 80, "kcal": 130, "protein_g": 4, "carbs_g": 25, "fat_g": 1 }
  ]
}
Eén entry per item hierboven, geen extra items. Gebruik 'nameNl' voor een korte Nederlandse productnaam.`;
}

const EstimateSchema = z.object({
  matched: z
    .array(
      z.object({
        nevoCode: z.number().int().positive(),
        grams: z.number().positive().max(5000),
      }),
    )
    .default([]),
  unmatched: z
    .array(
      z.object({
        searchName: z.string().min(1),
        nameNl: z.string().min(1),
        grams: z.number().positive().max(5000),
        kcal: z.number().nonnegative().max(10000),
        protein_g: z.number().nonnegative().max(500),
        carbs_g: z.number().nonnegative().max(500),
        fat_g: z.number().nonnegative().max(500),
      }),
    )
    .default([]),
});

const CalcResponseSchema = z.object({
  totals: z.object({
    kcal: z.number(),
    kj: z.number(),
    protein_g: z.number(),
    fat_g: z.number(),
    saturated_fat_g: z.number(),
    carbs_g: z.number(),
    sugar_g: z.number(),
    fiber_g: z.number(),
    salt_g: z.number(),
  }),
  items: z.array(
    z.object({
      nevo_code: z.number(),
      name_nl: z.string(),
      grams: z.number(),
      kcal: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
});

type CalcResponse = z.infer<typeof CalcResponseSchema>;

// Gemini geeft meestal pure JSON wanneer responseMimeType=json, maar valt
// soms terug op een markdown-code-fence. Strip die preventief, en trim.
function extractJson(text: string): string {
  let trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    const firstNl = trimmed.indexOf('\n');
    if (firstNl !== -1) trimmed = trimmed.slice(firstNl + 1);
    if (trimmed.endsWith('```')) trimmed = trimmed.slice(0, -3);
    trimmed = trimmed.trim();
  }
  return trimmed;
}

// ─── Gemini-calls ─────────────────────────────────────────────────────
//
// Gemini geeft bij overbelasting een 503 terug. Dat is een transient
// fout, dus we proberen tot 3 keer met exponential backoff (1s, 2s)
// voordat we opgeven.
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_DELAY_MS = 1000;

function isGeminiOverloadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 503) return true;
  const msg = e.message?.toLowerCase() ?? '';
  return msg.includes('503') || msg.includes('overloaded') || msg.includes('service unavailable');
}

async function generateContentWithRetry(
  active: ActiveVisionModel,
  prompt: string,
  inline: InlineImage,
  label: string,
  logger: PipelineLogger,
) {
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      return await active.client.generateContent([prompt, inline]);
    } catch (err) {
      if (!isGeminiOverloadError(err) || attempt === GEMINI_MAX_ATTEMPTS) {
        throw err;
      }
      const delay = GEMINI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger({
        level: 'warn',
        message: `Gemini overbelast (${label}, poging ${attempt}/${GEMINI_MAX_ATTEMPTS}); opnieuw over ${delay}ms`,
        data: { err: String(err) },
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Onbereikbaar — laatste poging gooit altijd of returnt.
  throw new Error('Gemini retry-loop liep uit zonder resultaat');
}

async function callGemini<T extends z.ZodTypeAny>(
  active: ActiveVisionModel,
  prompt: string,
  inline: InlineImage,
  schema: T,
  label: string,
  logger: PipelineLogger,
): Promise<z.infer<T>> {
  const result = await generateContentWithRetry(active, prompt, inline, label, logger);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (err) {
    logger({
      level: 'error',
      message: `Gemini gaf geen geldige JSON (${label})`,
      data: { text, err: String(err) },
    });
    throw new Error(GEMINI_PARSE_ERROR_MESSAGE);
  }
  const safe = schema.safeParse(parsed);
  if (!safe.success) {
    logger({
      level: 'error',
      message: `Gemini-response klopt niet met schema (${label})`,
      data: { parsed, issues: safe.error.issues },
    });
    throw new Error(GEMINI_PARSE_ERROR_MESSAGE);
  }
  return safe.data;
}

async function recognize(
  active: ActiveVisionModel,
  inline: InlineImage,
  logger: PipelineLogger,
): Promise<RecognizeResult> {
  logger({ level: 'info', message: 'Stap 1: foto naar Gemini voor herkenning…' });
  const data = await callGemini(active, RECOGNIZE_PROMPT, inline, RecognizeSchema, 'recognize', logger);
  logger({
    level: 'info',
    message: `Stap 1 klaar: ${data.items.length} items, confidence=${(data.confidence * 100).toFixed(0)}%`,
    data: { items: data.items.map((i) => ({ searchName: i.searchName, state: i.state })) },
  });
  return data;
}

async function estimate(
  active: ActiveVisionModel,
  inline: InlineImage,
  matched: MatchedItem[],
  unmatched: MatchedItem[],
  logger: PipelineLogger,
): Promise<z.infer<typeof EstimateSchema>> {
  logger({ level: 'info', message: 'Stap 3: gewicht per item door Gemini…' });
  const prompt = buildEstimatePrompt(matched, unmatched);
  const data = await callGemini(active, prompt, inline, EstimateSchema, 'estimate', logger);
  logger({
    level: 'info',
    message: `Stap 3 klaar: ${data.matched.length} gewichten + ${data.unmatched.length} Gemini-macro's`,
    data: { matched: data.matched, unmatched: data.unmatched },
  });
  return data;
}

export type AnalyzeResult = { analysis: PhotoAnalysis; model: GeminiModelName };

// Pipeline:
// 1. Gemini herkent ingrediënten (geen macro's).
// 2. /api/nevo/match → top-1 NEVO-match per ingredient.
// 3. Gemini schat gewicht per gematcht item, gegeven canonical NEVO-namen.
// 4. /api/nevo/calculate → definitieve macro's per item + totalen.
async function fetchCalculate(
  calcInput: { nevoCode: number; grams: number }[],
  logger: PipelineLogger,
): Promise<CalcResponse> {
  const calcRes = await fetch('/api/nevo/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: calcInput }),
  });
  if (!calcRes.ok) {
    const body = await calcRes.json().catch(() => null);
    logger({ level: 'error', message: `Calculate faalde: HTTP ${calcRes.status}`, data: body });
    if (calcRes.status === 503) throw new Error('NEVO is even niet bereikbaar. Probeer later opnieuw.');
    throw new Error('Berekening mislukt. Probeer opnieuw.');
  }
  const raw: unknown = await calcRes.json();
  const safe = CalcResponseSchema.safeParse(raw);
  if (!safe.success) {
    logger({
      level: 'error',
      message: 'Calculate-response klopt niet met schema',
      data: { raw, issues: safe.error.issues },
    });
    throw new Error('Berekening mislukt. Probeer opnieuw.');
  }
  return safe.data;
}

export async function analyzePhoto(file: File, apiKey: string, logger: PipelineLogger = NOOP_LOGGER): Promise<AnalyzeResult> {
  logger({ level: 'info', message: `Pipeline gestart (${file.name}, ${(file.size / 1024).toFixed(0)} KB)` });

  // Eén keer bytes lezen + base64; Gemini-client één keer instantiëren.
  // Beide stappen hergebruiken hetzelfde inline-image en dezelfde client,
  // zodat de 'model' in het resultaat ook gegarandeerd matcht met wat er
  // werkelijk is aangeroepen (incl. NEXT_PUBLIC_GEMINI_VISION_MODEL).
  const active = getVisionModel(apiKey);
  const inline = await fileToInlineData(file);

  const recognized = await recognize(active, inline, logger);

  logger({ level: 'info', message: 'Stap 2: NEVO matchen via /api/nevo/match…' });
  const matched = await matchIngredients(
    recognized.items.map((i) => ({
      name: i.searchName,
      state: i.state,
      visualHint: i.visualHint,
      edibleFraction: i.edibleFraction,
    })),
  );
  const matchedWithCode = matched.filter((m) => m.match);
  const unmatched = matched.filter((m) => !m.match);
  // Per item de source meegeven zodat het log-paneel direct laat zien of
  // een match via FTS, vector-fallback of niet kwam.
  logger({
    level: unmatched.length ? 'warn' : 'info',
    message: `Stap 2 klaar: ${matchedWithCode.length}/${matched.length} matched`,
    data: {
      matched: matchedWithCode.map((m) => ({
        input: m.inputName,
        nevoCode: m.match!.nevoCode,
        name: m.match!.nameNl,
        source: m.source,
      })),
      unmatched: unmatched.map((m) => ({ input: m.inputName, source: m.source })),
    },
  });
  const viaVector = matched.filter((m) => m.source === 'vector');
  if (viaVector.length) {
    // Aparte log-regel zodat in het PipelineLogPane direct opvalt wanneer
    // de vector-fallback heeft bijgesprongen — incl. welke FTS-top is
    // afgewezen om de keuze inzichtelijk te maken.
    logger({
      level: 'info',
      message: `Vector-fallback redde ${viaVector.length} item(s)`,
      data: viaVector.map((m) => ({
        input: m.inputName,
        nevoCode: m.match!.nevoCode,
        name: m.match!.nameNl,
        rejectedFtsTop: m.rejectedFtsTop,
      })),
    });
  }
  const estimated = await estimate(active, inline, matchedWithCode, unmatched, logger);

  // /calculate accepteert alleen nevoCodes die ook in stap 2 zijn
  // gematcht; filter Gemini's output zodat een halucinatie geen 422
  // veroorzaakt.
  const allowed = new Set(matchedWithCode.map((m) => m.match!.nevoCode));
  const calcInput = estimated.matched.filter((i) => allowed.has(i.nevoCode));

  // Bruto-naar-eetbaar correctie: voor items met niet-eetbare schil/pit
  // (banaan, sinaasappel, etc.) heeft Gemini step-1 een 'edibleFraction'
  // gegeven. We scalen het bruto gewogen gewicht naar het netto eetbare
  // gewicht vóór /calculate, anders rekenen we kcal van NEVO over het
  // schilgewicht óók — leverde 596 kcal voor een banaan (bug 2026-05-04).
  const fractionByCode = new Map<number, number>(
    matchedWithCode.map((m) => [m.match!.nevoCode, m.edibleFraction ?? 1]),
  );
  const scaled = calcInput.map((i) => ({
    nevoCode: i.nevoCode,
    grams: Math.round(i.grams * (fractionByCode.get(i.nevoCode) ?? 1)),
  }));
  const peeled = calcInput.filter(
    (i) => (fractionByCode.get(i.nevoCode) ?? 1) < 1,
  );
  if (peeled.length) {
    logger({
      level: 'info',
      message: `Bruto→eetbaar correctie op ${peeled.length} item(s)`,
      data: peeled.map((i) => {
        const f = fractionByCode.get(i.nevoCode) ?? 1;
        const m = matchedWithCode.find((mm) => mm.match!.nevoCode === i.nevoCode);
        return {
          name: m?.match?.nameNl ?? `nevo ${i.nevoCode}`,
          gross: i.grams,
          edibleFraction: f,
          net: Math.round(i.grams * f),
        };
      }),
    });
  }

  let nevoItems: PhotoAnalysis['items'] = [];
  if (calcInput.length) {
    logger({ level: 'info', message: 'Stap 4: macro\'s berekenen via /api/nevo/calculate…' });
    const calc = await fetchCalculate(scaled, logger);
    logger({
      level: 'info',
      message: `Stap 4 klaar: ${calc.totals.kcal} kcal totaal (NEVO)`,
      data: { totals: calc.totals, items: calc.items.map((i) => ({ nevoCode: i.nevo_code, name: i.name_nl, grams: i.grams, kcal: i.kcal })) },
    });
    nevoItems = calc.items.map((it) => ({
      name: it.name_nl,
      estimatedGrams: it.grams,
      calories: it.kcal,
      protein: it.protein_g,
      carbs: it.carbs_g,
      fat: it.fat_g,
      nevoCode: it.nevo_code,
    }));
  } else {
    logger({ level: 'warn', message: 'Stap 4 overgeslagen: geen NEVO-matches.' });
  }

  // Items zonder NEVO-match krijgen Gemini's eigen macro-schatting; die
  // gaan zonder nevoCode in het overzicht zodat de gebruiker ze later
  // kan bijschaven.
  //
  // Voor unmatched items met edibleFraction < 1 schalen we BEIDE grams en
  // alle macro's lineair. Gemini schat de macro's voor het bruto-gewicht
  // (banaan met schil = 200g) terwijl de gebruiker alleen het vlees
  // (130g) eet. Lineaire scaling is correct omdat macro's per gram
  // constant zijn voor een ingrediënt.
  const fractionByInput = new Map<string, number>(
    unmatched.map((m) => [m.inputName, m.edibleFraction ?? 1]),
  );
  const geminiItems: PhotoAnalysis['items'] = estimated.unmatched.map((u) => {
    const f = fractionByInput.get(u.searchName) ?? 1;
    const scale = (n: number) => Math.round(n * f * 10) / 10;
    return {
      name: u.nameNl,
      estimatedGrams: Math.round(u.grams * f),
      calories: Math.round(u.kcal * f),
      protein: scale(u.protein_g),
      carbs: scale(u.carbs_g),
      fat: scale(u.fat_g),
    };
  });

  const items = [...nevoItems, ...geminiItems];
  if (!items.length) {
    throw new Error('AI-analyse leverde geen bruikbare items op. Probeer een andere foto.');
  }
  if (geminiItems.length) {
    logger({
      level: 'info',
      message: `${geminiItems.length} item(s) ingevuld door Gemini (geen NEVO-match)`,
      data: geminiItems.map((g) => ({ name: g.name, grams: g.estimatedGrams, kcal: g.calories })),
    });
  }

  const trimmedTitle = recognized.title?.trim().slice(0, MEAL_TITLE_MAX_LENGTH);
  const analysis: PhotoAnalysis = {
    title: trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : undefined,
    confidence: recognized.confidence,
    notes: recognized.notes,
    items,
  };

  logger({ level: 'info', message: 'Pipeline klaar — review-stap actief' });
  return { analysis, model: active.name };
}

export { detectImageType, type GeminiImageMimeType } from '../lib/image-bytes';
