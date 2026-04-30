import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

// Browser-side: de API key komt uit de user's localStorage (zie
// shared/lib/gemini-key-storage). De sleutel raakt onze server nooit
// aan — Gemini wordt direct vanuit de browser aangeroepen.

export const GEMINI_VISION_MODEL = 'gemini-3.1-flash-lite-preview';

export type GeminiModelName = string;

export type ActiveVisionModel = {
  name: GeminiModelName;
  client: GenerativeModel;
};

export function getVisionModel(apiKey: string): ActiveVisionModel {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  const overrideModel = process.env.NEXT_PUBLIC_GEMINI_VISION_MODEL;
  const name = overrideModel || GEMINI_VISION_MODEL;
  const client = new GoogleGenerativeAI(trimmed).getGenerativeModel({
    model: name,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
  return { name, client };
}
