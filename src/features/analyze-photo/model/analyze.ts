import { z } from 'zod';
import {
  GEMINI_FALLBACK_MODEL,
  GEMINI_PRIMARY_MODEL,
  getVisionModel,
  isQuotaError,
  type GeminiModelName,
} from '@/shared/api/gemini';
import type { PhotoAnalysis } from '@/entities/meal';

const AnalysisSchema = z.object({
  confidence: z.number().min(0).max(1),
  items: z.array(
    z.object({
      name: z.string(),
      estimatedGrams: z.number(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    }),
  ),
  notes: z.string().optional(),
}) satisfies z.ZodType<PhotoAnalysis>;

const SYSTEM_PROMPT = `Je bent een voedingsexpert die foto's van maaltijden analyseert voor een calorie-tracker app.

Analyseer de foto en identificeer alle zichtbare voedingsmiddelen. Voor elk item:
1. Geef een duidelijke Nederlandse naam
2. Schat de portiegrootte in gram (wees realistisch, gebruik zichtbare referenties zoals borden/bestek)
3. Bereken calorieën, eiwitten, koolhydraten en vetten voor die portie

Geef ook een confidence score (0-1):
- 1.0 = zeker, duidelijk herkenbaar standaardgerecht
- 0.7 = redelijk zeker, enige aanname over ingrediënten
- 0.4 = lage zekerheid, veel aannames
- < 0.3 = raad de gebruiker aan handmatig in te voeren

Antwoord ALLEEN met geldige JSON in dit formaat:
{
  "confidence": 0.8,
  "items": [
    { "name": "Gegrilde kipfilet", "estimatedGrams": 150, "calories": 248, "protein": 46, "carbs": 0, "fat": 5 }
  ],
  "notes": "Optionele toelichting voor onzekerheden"
}`;

export type GeminiImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif';

// Magic bytes per formaat dat Gemini 2.5 ondersteunt. file.type is
// browser-input en kan liegen — sniff de eerste bytes om willekeurige
// uploads onder een image-vlag te blokkeren.
//   JPEG: FF D8 FF                            (offset 0)
//   PNG:  89 50 4E 47                         (offset 0)
//   WebP: RIFF....WEBP                        (offset 0 + 8)
//   HEIC: ....ftyp{heic|heix|mif1|msf1}       (offset 4)
function asciiAt(view: Uint8Array, offset: number, length: number): string {
  if (view.length < offset + length) return '';
  let out = '';
  for (let i = offset; i < offset + length; i++) out += String.fromCharCode(view[i]);
  return out;
}

export function detectImageType(view: Uint8Array): GeminiImageMimeType | null {
  if (view.length < 12) return null;
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return 'image/jpeg';
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return 'image/png';
  if (asciiAt(view, 0, 4) === 'RIFF' && asciiAt(view, 8, 4) === 'WEBP') return 'image/webp';
  if (asciiAt(view, 4, 4) === 'ftyp') {
    const brand = asciiAt(view, 8, 4);
    if (brand === 'heic' || brand === 'heix') return 'image/heic';
    if (brand === 'mif1' || brand === 'msf1' || brand === 'heif') return 'image/heif';
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Browser: gebruik btoa via een chunk-loop om grote arrays op te
  // delen (btoa van een grote string crasht in sommige browsers).
  if (typeof window !== 'undefined') {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return window.btoa(binary);
  }
  // Node fallback (we gebruiken dit niet meer in productie maar handig
  // voor toekomstige tests).
  return Buffer.from(buffer).toString('base64');
}

export type AnalyzeResult = {
  analysis: PhotoAnalysis;
  // Welk model uiteindelijk antwoord gaf — handig voor UX-melding wanneer
  // we automatisch zijn teruggevallen op lite na een quota-hit.
  model: GeminiModelName;
};

async function callModel(
  apiKey: string,
  modelName: GeminiModelName,
  base64: string,
  mimeType: GeminiImageMimeType,
): Promise<PhotoAnalysis> {
  const result = await getVisionModel(apiKey, modelName).generateContent([
    SYSTEM_PROMPT,
    { inlineData: { data: base64, mimeType } },
  ]);
  const text = result.response.text();
  try {
    const parsed = JSON.parse(text);
    return AnalysisSchema.parse(parsed);
  } catch (err) {
    console.error('Failed to parse Gemini response:', text, err);
    throw new Error('AI-analyse gaf geen geldig resultaat. Probeer een andere foto.');
  }
}

export async function analyzePhoto(file: File, apiKey: string): Promise<AnalyzeResult> {
  const buffer = await file.arrayBuffer();
  const view = new Uint8Array(buffer);
  const mimeType = detectImageType(view);
  if (!mimeType) {
    throw new Error('IMAGE_FORMAT_INVALID');
  }
  const base64 = arrayBufferToBase64(buffer);

  // Probeer eerst flash; valt automatisch terug op lite zodra Gemini
  // 429/quota teruggeeft. Andere fouten propageren direct zodat de UI
  // een echte foutmelding kan tonen.
  try {
    const analysis = await callModel(apiKey, GEMINI_PRIMARY_MODEL, base64, mimeType);
    return { analysis, model: GEMINI_PRIMARY_MODEL };
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    console.warn('[analyzePhoto] flash quota hit — fallback naar lite');
    const analysis = await callModel(apiKey, GEMINI_FALLBACK_MODEL, base64, mimeType);
    return { analysis, model: GEMINI_FALLBACK_MODEL };
  }
}
