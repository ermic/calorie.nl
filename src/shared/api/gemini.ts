import { GoogleGenerativeAI } from '@google/generative-ai';

// Browser-side: de API key komt uit de user's localStorage (zie
// shared/lib/gemini-key-storage). De sleutel raakt onze server nooit
// aan — Gemini wordt direct vanuit de browser aangeroepen.
//
// Geen env-var fallback meer: de calorietracker draait niet zelf met
// een service-account key. Dat zou ook niet schalen — Google's quota
// per project is gedeeld over alle users.
export function getVisionModel(apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenerativeAI(trimmed).getGenerativeModel({
    model: process.env.NEXT_PUBLIC_GEMINI_VISION_MODEL ?? 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
}
