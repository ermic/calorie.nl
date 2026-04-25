import { GoogleGenerativeAI } from '@google/generative-ai';

// Browser-side: de API key komt uit de user's localStorage (zie
// shared/lib/gemini-key-storage). De sleutel raakt onze server nooit
// aan — Gemini wordt direct vanuit de browser aangeroepen.
//
// Twee model-paden:
// - PRIMARY: gemini-2.5-flash, betere herkenning maar lagere quota.
// - FALLBACK: gemini-2.5-flash-lite, ruimere quota voor wanneer
//   primary's dagelijkse limiet bereikt is.
// analyzePhoto beslist welke te gebruiken op basis van het 429-pad.

export const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
export const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';

export type GeminiModelName = string;

export function getVisionModel(apiKey: string, modelName: GeminiModelName = GEMINI_PRIMARY_MODEL) {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  const overrideModel = process.env.NEXT_PUBLIC_GEMINI_VISION_MODEL;
  return new GoogleGenerativeAI(trimmed).getGenerativeModel({
    model: overrideModel || modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
}

// Check of een error een quota/rate-limit-fout is — dan is fallback
// naar het lite-model zinvol. Andere fouten (auth, model not found,
// netwerk) moeten doorpropageren zodat de UI een echte foutmelding
// geeft.
export function isQuotaError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : '';
  return raw.includes('429') || /quota/i.test(raw);
}
