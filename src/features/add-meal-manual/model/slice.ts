import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { guessMealType, type EditableMealItem, type MealType } from '@/entities/meal';
import type { FoodSearchHit } from '@/entities/food';

export type AddMealManualState = {
  items: EditableMealItem[];
  mealType: MealType;
};

const initialState: AddMealManualState = {
  items: [],
  mealType: 'LUNCH',
};

// Schaal een FoodSearchHit (kcal per 100g) naar een EditableMealItem met
// de gekozen hoeveelheid. Clamp op ≥ 0 omdat OFF-data soms onverwachte
// waardes teruggeeft.
function scaleFromHit(hit: FoodSearchHit, grams: number): EditableMealItem {
  const factor = Math.max(0, grams) / 100;
  const nonNeg = (n: number) => Math.max(0, Math.round(n * factor));
  return {
    clientId: nanoid(),
    name: hit.brand ? `${hit.brand} · ${hit.name}` : hit.name,
    quantity: Math.max(0, grams),
    unit: 'g',
    calories: nonNeg(hit.caloriesPer100),
    protein: nonNeg(hit.proteinPer100),
    carbs: nonNeg(hit.carbsPer100),
    fat: nonNeg(hit.fatPer100),
  };
}

const slice = createSlice({
  name: 'addMealManual',
  initialState,
  reducers: {
    itemUpdated(
      state,
      action: PayloadAction<Partial<EditableMealItem> & Pick<EditableMealItem, 'clientId'>>,
    ) {
      const idx = state.items.findIndex((i) => i.clientId === action.payload.clientId);
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
    },
    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.clientId !== action.payload);
    },
    emptyItemAdded(state) {
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
    foodHitAdded: {
      reducer(state, action: PayloadAction<EditableMealItem>) {
        state.items.push(action.payload);
      },
      prepare(input: { hit: FoodSearchHit; grams?: number }) {
        return { payload: scaleFromHit(input.hit, input.grams ?? 100) };
      },
    },
    mealTypeSet(state, action: PayloadAction<MealType>) {
      state.mealType = action.payload;
    },
    wizardReset() {
      return { ...initialState, mealType: guessMealType() };
    },
  },
});

export const {
  itemUpdated,
  itemRemoved,
  emptyItemAdded,
  foodHitAdded,
  mealTypeSet,
  wizardReset,
} = slice.actions;

export default slice.reducer;
