// Shape van het AI-foto-analyse resultaat — gedeeld tussen server-side
// parser (features/analyze-photo) en de client-side flow (features/add-
// meal-photo) zonder dat die features elkaar hoeven te importeren.
export type PhotoAnalysisItem = {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Optioneel — gevuld bij NEVO-pipeline, leeg bij oude analyses.
  nevoCode?: number;
};

export type PhotoAnalysis = {
  confidence: number;
  items: PhotoAnalysisItem[];
  notes?: string;
};
