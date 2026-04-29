import { z } from 'zod';
import { GEMINI_VISION_MODEL, getVisionModel, type GeminiModelName } from '@/shared/api/gemini';
import type { PhotoAnalysis } from '@/entities/meal';
import { fileToInlineData } from '../lib/image-bytes';
import { matchIngredients, type MatchedItem } from './match';

// ─── Logger ────────────────────────────────────────────────────────────
export type PipelineLogEntry = {
  ts: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
};

export type PipelineLogger = (entry: Omit<PipelineLogEntry, 'ts'>) => void;

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

Antwoord ALLEEN met geldige JSON:
{
  "confidence": 0.85,
  "items": [
    { "searchName": "chicken fillet", "state": "prepared", "visualHint": "1 filet van ~150g" },
    { "searchName": "rice", "state": "boiled", "visualHint": "halve borddiameter" }
  ],
  "notes": "Optionele toelichting"
}`;

const RecognizeSchema = z.object({
  confidence: z.number().min(0).max(1),
  items: z
    .array(
      z.object({
        searchName: z.string().min(1),
        state: z.string().optional(),
        visualHint: z.string().optional(),
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

type CalcItemOut = {
  nevo_code: number;
  name_nl: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type CalcResponse = {
  totals: {
    kcal: number;
    kj: number;
    protein_g: number;
    fat_g: number;
    saturated_fat_g: number;
    carbs_g: number;
    sugar_g: number;
    fiber_g: number;
    salt_g: number;
  };
  items: CalcItemOut[];
};

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
async function recognize(file: File, apiKey: string, logger: PipelineLogger): Promise<RecognizeResult> {
  logger({ level: 'info', message: 'Stap 1: foto naar Gemini voor herkenning…' });
  const inline = await fileToInlineData(file);
  const result = await getVisionModel(apiKey).generateContent([RECOGNIZE_PROMPT, inline]);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (err) {
    logger({ level: 'error', message: 'Gemini gaf geen geldige JSON (recognize)', data: { text, err: String(err) } });
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
  const safe = RecognizeSchema.safeParse(parsed);
  if (!safe.success) {
    logger({
      level: 'error',
      message: 'Gemini-response klopt niet met schema (recognize)',
      data: { parsed, issues: safe.error.issues },
    });
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
  logger({
    level: 'info',
    message: `Stap 1 klaar: ${safe.data.items.length} items, confidence=${(safe.data.confidence * 100).toFixed(0)}%`,
    data: { items: safe.data.items.map((i) => ({ searchName: i.searchName, state: i.state })) },
  });
  return safe.data;
}

async function estimate(
  file: File,
  apiKey: string,
  matched: MatchedItem[],
  unmatched: MatchedItem[],
  logger: PipelineLogger,
): Promise<z.infer<typeof EstimateSchema>> {
  logger({ level: 'info', message: 'Stap 3: gewicht per item door Gemini…' });
  const inline = await fileToInlineData(file);
  const prompt = buildEstimatePrompt(matched, unmatched);
  const result = await getVisionModel(apiKey).generateContent([prompt, inline]);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (err) {
    logger({ level: 'error', message: 'Gemini gaf geen geldige JSON (estimate)', data: { text, err: String(err) } });
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
  const safe = EstimateSchema.safeParse(parsed);
  if (!safe.success) {
    logger({
      level: 'error',
      message: 'Gemini-response klopt niet met schema (estimate)',
      data: { parsed, issues: safe.error.issues },
    });
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
  logger({
    level: 'info',
    message: `Stap 3 klaar: ${safe.data.matched.length} gewichten + ${safe.data.unmatched.length} Gemini-macro's`,
    data: { matched: safe.data.matched, unmatched: safe.data.unmatched },
  });
  return safe.data;
}

export type AnalyzeResult = { analysis: PhotoAnalysis; model: GeminiModelName };

// Pipeline:
// 1. Gemini herkent ingrediënten (geen macro's).
// 2. /api/nevo/match → top-1 NEVO-match per ingredient.
// 3. Gemini schat gewicht per gematcht item, gegeven canonical NEVO-namen.
// 4. /api/nevo/calculate → definitieve macro's per item + totalen.
export async function analyzePhoto(file: File, apiKey: string, logger: PipelineLogger = NOOP_LOGGER): Promise<AnalyzeResult> {
  logger({ level: 'info', message: `Pipeline gestart (${file.name}, ${(file.size / 1024).toFixed(0)} KB)` });

  const recognized = await recognize(file, apiKey, logger);

  logger({ level: 'info', message: 'Stap 2: NEVO matchen via /api/nevo/match…' });
  const matched = await matchIngredients(
    recognized.items.map((i) => ({ name: i.searchName, state: i.state, visualHint: i.visualHint })),
  );
  const matchedWithCode = matched.filter((m) => m.match);
  const unmatched = matched.filter((m) => !m.match);
  logger({
    level: unmatched.length ? 'warn' : 'info',
    message: `Stap 2 klaar: ${matchedWithCode.length}/${matched.length} matched`,
    data: {
      matched: matchedWithCode.map((m) => ({ input: m.inputName, nevoCode: m.match!.nevoCode, name: m.match!.nameNl })),
      unmatched: unmatched.map((m) => m.inputName),
    },
  });
  const estimated = await estimate(file, apiKey, matchedWithCode, unmatched, logger);

  // /calculate accepteert alleen nevoCodes die ook in stap 2 zijn
  // gematcht; filter Gemini's output zodat een halucinatie geen 422
  // veroorzaakt.
  const allowed = new Set(matchedWithCode.map((m) => m.match!.nevoCode));
  const calcInput = estimated.matched.filter((i) => allowed.has(i.nevoCode));

  let nevoItems: PhotoAnalysis['items'] = [];
  if (calcInput.length) {
    logger({ level: 'info', message: 'Stap 4: macro\'s berekenen via /api/nevo/calculate…' });
    const calcRes = await fetch('/api/nevo/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: calcInput.map((i) => ({ nevoCode: i.nevoCode, grams: i.grams })),
      }),
    });
    if (!calcRes.ok) {
      let body: unknown = null;
      try {
        body = await calcRes.json();
      } catch {
        // empty
      }
      logger({ level: 'error', message: `Calculate faalde: HTTP ${calcRes.status}`, data: body });
      if (calcRes.status === 503) throw new Error('NEVO is even niet bereikbaar. Probeer later opnieuw.');
      throw new Error('Berekening mislukt. Probeer opnieuw.');
    }
    const calc = (await calcRes.json()) as CalcResponse;
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
  const geminiItems: PhotoAnalysis['items'] = estimated.unmatched.map((u) => ({
    name: u.nameNl,
    estimatedGrams: u.grams,
    calories: u.kcal,
    protein: u.protein_g,
    carbs: u.carbs_g,
    fat: u.fat_g,
  }));

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

  const analysis: PhotoAnalysis = {
    confidence: recognized.confidence,
    notes: recognized.notes,
    items,
  };

  logger({ level: 'info', message: 'Pipeline klaar — review-stap actief' });
  return { analysis, model: GEMINI_VISION_MODEL };
}

export { detectImageType, type GeminiImageMimeType } from '../lib/image-bytes';
