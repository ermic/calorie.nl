import { GoogleGenerativeAI } from '@google/generative-ai';

// Browser-side: de API key komt uit de user's localStorage (zie
// shared/lib/gemini-key-storage). De sleutel raakt onze server nooit
// aan — Gemini wordt direct vanuit de browser aangeroepen.

export const GEMINI_VISION_MODEL = 'gemini-2.5-flash';

export type GeminiModelName = string;

export function getVisionModel(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  const overrideModel = process.env.NEXT_PUBLIC_GEMINI_VISION_MODEL;
  return new GoogleGenerativeAI(trimmed).getGenerativeModel({
    model: overrideModel || GEMINI_VISION_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
}
