// Demo stub — de AI-pipeline (Gemini-prompts, retry-logica, Zod-schemas
// voor het parsen van model-output) is weggelaten uit de publieke demo.
// In de echte codebase doet dit bestand:
//   1. RECOGNIZE: voedingsmiddelen op de foto identificeren (Engelse zoektermen)
//   2. MATCH: zoektermen tegen NEVO-tabel matchen (zie nevo-match feature)
//   3. ESTIMATE: gewicht + macro's per item schatten
// Telkens met response-schema-validatie en retries op transient failures.

export type AnalyzeInput = {
  imageDataUrl: string;
  apiKey: string;
};

export type AnalyzeResult = {
  title: string;
  confidence: number;
  items: Array<{
    name: string;
    grams: number;
    kcal: number;
  }>;
};

export async function analyzeMealPhoto(_input: AnalyzeInput): Promise<AnalyzeResult> {
  throw new Error('demo: photo analysis pipeline is not included in the public demo');
}
