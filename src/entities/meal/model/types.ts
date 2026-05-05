import type { Meal, MealItem } from '@/payload-types';

export type MealType = NonNullable<Meal['mealType']>;
export type { Meal, MealItem };

export type MealItemMacros = {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

// Per-100g snapshot van een NEVO-pick. Niet opgeslagen in de DB; alleen
// gebruikt door de editor om quantity-changes lineair te schalen en de
// reset-knop weer naar de NEVO-baseline te brengen.
export type NevoPer100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// Snapshot van de "authoritative" startwaarden van een item (foto-analyse,
// food-search of eerste autocomplete-pick). Driver voor de undo-knop in
// de editor — niets meer dan een kopie van de macro-velden + identificatie.
export type EditableMealItemSnapshot = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nevoCode?: number;
};

// Editable item gebruikt door zowel de photo- als manual-add-meal flows.
// clientId is een nanoid voor React-keys en patch-targeting vóór opslag.
export type EditableMealItem = {
  clientId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Pipeline-context: gezet wanneer de macros uit NEVO komen, leeg bij
  // handmatige toevoeging of upgrades vanuit andere bronnen.
  nevoCode?: number;
  // Per-100g macro's uit NEVO; aanwezig zodra de gebruiker een suggestie
  // heeft gekozen. Driver voor quantity-rescale.
  nevoPer100g?: NevoPer100g;
  // Snapshot van de eerste authoritative state (analyse-resultaat,
  // food-pick of eerste autocomplete-pick op een leeg item). Driver
  // voor de undo-knop. Nooit overschreven na zetten.
  original?: EditableMealItemSnapshot;
};

export type MealTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function sumMealItems(items: MealItemMacros[]): MealTotals {
  return items.reduce<MealTotals>(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Ontbijt',
  LUNCH: 'Lunch',
  DINNER: 'Diner',
  SNACK: 'Tussendoor',
};

export const MEAL_TYPE_ORDER: readonly MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

// Hard cap op een meal-titel (AI-summary of door-user bewerkt). Eén bron
// voor zod-validatie in /api/meals/save, het maxLength in de Payload-
// collection en de input-cap in de review-UI. Komt overeen met de
// varchar-kolom uit migration 20260505_120000_add_meal_title.
export const MEAL_TITLE_MAX_LENGTH = 120;

// Tijd-gebaseerde default voor nieuwe maaltijden; gebruikt door photo- en
// manual-flow wizards. `tz` is optioneel — wordt gebruikt door server-
// side callers (anders zou Date.getHours() de UTC-hour gebruiken in
// productie). Client-side callers laten 'm leeg en krijgen de browser-tz.
export function guessMealType(now: Date = new Date(), tz?: string): MealType {
  const h = tz ? hourInTimezone(now, tz) : now.getHours();
  if (h < 10) return 'BREAKFAST';
  if (h < 15) return 'LUNCH';
  if (h < 21) return 'DINNER';
  return 'SNACK';
}

function hourInTimezone(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value;
  // Edge: bij invalid tz throwt Intl al; '24' kan voorkomen op sommige
  // runtimes voor middernacht — normaliseer naar 0.
  const n = hour ? Number(hour) : 0;
  return n === 24 ? 0 : n;
}
