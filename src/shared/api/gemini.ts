// Demo stub — productie-implementatie weggelaten uit de publieke demo.
//
// In de echte codebase richt dit bestand een Gemini-client in vanuit een
// browser-side API-key en stelt de generation-config voor vision-prompts in.

import type { GenerativeModel } from '@google/generative-ai';

export const GEMINI_VISION_MODEL = 'gemini-vision-stub';

export type GeminiModelName = string;

export type ActiveVisionModel = {
  name: GeminiModelName;
  client: GenerativeModel;
};

export function getVisionModel(_apiKey: string): ActiveVisionModel {
  throw new Error('demo: gemini integration is not included in the public demo');
}
