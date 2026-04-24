import { GoogleGenerativeAI } from '@google/generative-ai';

export function getVisionModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is niet geconfigureerd');
  }
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
}
