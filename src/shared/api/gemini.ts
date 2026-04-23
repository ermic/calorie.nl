import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is niet geconfigureerd');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const visionModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.2,
    responseMimeType: 'application/json',
  },
});
