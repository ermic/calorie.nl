import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { guessMealType, type EditableMealItem, type MealType, type PhotoAnalysis } from '@/entities/meal';

export type Step = 'capture' | 'review';

export type AddMealPhotoState = {
  step: Step;
  items: EditableMealItem[];
  mealType: MealType;
  confidence: number | null;
  notes: string | null;
  // Onveranderlijke kopie van de oorspronkelijke AI-analyse — los van
  // 'items' zodat user-edits, rescales en undo's de baseline niet kunnen
  // overschrijven. Wordt meegestuurd bij save als trainingssignaal.
  aiSnapshot: PhotoAnalysis | null;
  // 1 (slecht/rood) t/m 5 (top/groen). null tot de gebruiker een smiley
  // aantikt; mag null blijven (rating is optioneel).
  userRating: number | null;
};

// Statische fallback; mealType wordt gerefreshed bij elke wizardReset
// zodat een lang-open tab niet met een stale ontbijt-default blijft zitten.
const initialState: AddMealPhotoState = {
  step: 'capture',
  items: [],
  mealType: 'LUNCH',
  confidence: null,
  notes: null,
  aiSnapshot: null,
  userRating: null,
};

const slice = createSlice({
  name: 'addMealPhoto',
  initialState,
  reducers: {
    analysisSucceeded(state, action: PayloadAction<PhotoAnalysis>) {
      state.items = action.payload.items.map((i) => {
        const snapshot = {
          name: i.name,
          quantity: i.estimatedGrams,
          unit: 'g',
          calories: Math.round(i.calories),
          protein: Math.round(i.protein),
          carbs: Math.round(i.carbs),
          fat: Math.round(i.fat),
          nevoCode: i.nevoCode,
        };
        return {
          clientId: nanoid(),
          ...snapshot,
          original: snapshot,
        };
      });
      state.confidence = action.payload.confidence;
      state.notes = action.payload.notes ?? null;
      state.aiSnapshot = action.payload;
      state.userRating = null;
      state.step = 'review';
    },
    ratingSet(state, action: PayloadAction<number | null>) {
      state.userRating = action.payload;
    },
    itemUpdated(state, action: PayloadAction<Partial<EditableMealItem> & Pick<EditableMealItem, 'clientId'>>) {
      const idx = state.items.findIndex((i) => i.clientId === action.payload.clientId);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.clientId !== action.payload);
    },
    itemAdded(state) {
      state.items.push({
        clientId: nanoid(),
        name: '',
        quantity: 100,
        unit: 'g',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    },
    mealTypeSet(state, action: PayloadAction<MealType>) {
      state.mealType = action.payload;
    },
    wizardReset() {
      return { ...initialState, mealType: guessMealType() };
    },
    backToCapture(state) {
      state.step = 'capture';
    },
  },
});

export const {
  analysisSucceeded,
  itemUpdated,
  itemRemoved,
  itemAdded,
  mealTypeSet,
  ratingSet,
  wizardReset,
  backToCapture,
} = slice.actions;

export default slice.reducer;
