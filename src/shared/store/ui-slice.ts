import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

export type UiState = {
  addMealSheetOpen: boolean;
  toasts: Toast[];
};

const initialState: UiState = {
  addMealSheetOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openAddMealSheet(state) {
      state.addMealSheetOpen = true;
    },
    closeAddMealSheet(state) {
      state.addMealSheetOpen = false;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(input: { type: ToastType; message: string }) {
        return {
          payload: {
            id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
            type: input.type,
            message: input.message,
          },
        };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { openAddMealSheet, closeAddMealSheet, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
