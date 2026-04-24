import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { guessMealType, type EditableMealItem, type MealType, type PhotoAnalysis } from '@/entities/meal';

export type Step = 'capture' | 'review';

export type AddMealPhotoState = {
  step: Step;
  items: EditableMealItem[];
  mealType: MealType;
  confidence: number | null;
  notes: string | null;
};

// Statische fallback; mealType wordt gerefreshed bij elke wizardReset
// zodat een lang-open tab niet met een stale ontbijt-default blijft zitten.
const initialState: AddMealPhotoState = {
  step: 'capture',
  items: [],
  mealType: 'LUNCH',
  confidence: null,
  notes: null,
};

const slice = createSlice({
  name: 'addMealPhoto',
  initialState,
  reducers: {
    analysisSucceeded(state, action: PayloadAction<PhotoAnalysis>) {
      state.items = action.payload.items.map((i) => ({
        clientId: nanoid(),
        name: i.name,
        quantity: i.estimatedGrams,
        unit: 'g',
        calories: Math.round(i.calories),
        protein: Math.round(i.protein),
        carbs: Math.round(i.carbs),
        fat: Math.round(i.fat),
      }));
      state.confidence = action.payload.confidence;
      state.notes = action.payload.notes ?? null;
      state.step = 'review';
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
  wizardReset,
  backToCapture,
} = slice.actions;

export default slice.reducer;
