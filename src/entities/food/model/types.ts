import type { Food } from '@/payload-types';

export type { Food };

// Gedeeld formaat tussen /api/foods/search en de UI.
//
// Drie bronnen:
// - 'local'  Payload-collectie van eigen + verified foods, macros vooraf bekend.
// - 'off'    Open Food Facts (branded products met barcode), macros vooraf bekend.
// - 'nevo'   Dutch reference NEVO via microservice. Macros zijn op zoek-moment
//            niet beschikbaar (FTS-resultaat geeft alleen naam + groep);
//            caller moet ze ophalen via /api/nevo/calculate vóór de pick als
//            EditableMealItem belandt. In de hit zelf staan ze als 0.
export type FoodSearchHit = {
  source: 'local' | 'off' | 'nevo';
  /** Voor 'local' = Payload-id; voor 'nevo' = nevo_code; voor 'off' = null. */
  id: number | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  /** Voor 'nevo': de NL-foodgroep (subtitle in de UI). Anders null. */
  foodGroupNl?: string | null;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};
