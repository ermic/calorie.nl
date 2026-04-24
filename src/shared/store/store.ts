import { configureStore, type Reducer, type ReducersMapObject } from '@reduxjs/toolkit';
import type { AddMealPhotoState } from '@/features/add-meal-photo/model/slice';
import type { AddMealManualState } from '@/features/add-meal-manual/model/slice';
import uiReducer, { type UiState } from './ui-slice';

// FSD-opmerking: shared/store componeert de types voor een eenvoudige
// RootState, maar alléén via type-only imports. De runtime-registratie
// van feature-reducers gebeurt in de app-laag (providers.tsx) via
// makeStore({ ... }) — zodat shared geen runtime-afhankelijkheid heeft
// van features.
export type RootState = {
  ui: UiState;
  addMealPhoto: AddMealPhotoState;
  addMealManual: AddMealManualState;
};

export const makeStore = (extraReducers: ReducersMapObject = {}) =>
  configureStore({
    reducer: {
      ui: uiReducer as Reducer<UiState>,
      ...extraReducers,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
