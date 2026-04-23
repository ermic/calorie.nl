import { z } from 'zod';
import { visionModel } from '@/shared/api/gemini';

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
});

export type PhotoAnalysis = z.infer<typeof AnalysisSchema>;

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

export async function analyzePhoto(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<PhotoAnalysis> {
  const result = await visionModel.generateContent([
    SYSTEM_PROMPT,
    { inlineData: { data: imageBase64, mimeType } },
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
