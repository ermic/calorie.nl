// Demo stub — interne nutrientcontent-microservice weggelaten uit de
// publieke demo. Types zijn behouden zodat consumers blijven type-checken.

import 'server-only';

export class NutrientContentError extends Error {
  constructor(
    msg: string,
    public status: number,
  ) {
    super(msg);
    this.name = 'NutrientContentError';
  }
}

export type SearchHit = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  food_group_nl: string;
  food_group_en: string;
};

export type VectorHit = SearchHit & { similarity: number };

export type NutrientValue = {
  code: string;
  name_nl: string;
  name_en: string;
  group_nl: string;
  group_en: string;
  unit: string;
  value_per_100: number | null;
};

export type FoodDetail = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  food_group_nl: string;
  food_group_en: string;
  quantity: string;
  synonyms: string | null;
  note: string | null;
  nutrients: NutrientValue[];
};

export type CalcRequestItem = { nevo_code: number; grams: number };

export type CalcTotals = {
  kcal: number;
  kj: number;
  protein_g: number;
  fat_g: number;
  saturated_fat_g: number;
  carbs_g: number;
  sugar_g: number;
  fiber_g: number;
  salt_g: number;
};

export type CalcItemOut = {
  nevo_code: number;
  name_nl: string;
  name_en: string;
  grams: number;
  kcal: number;
};

export type CalcResponse = { totals: CalcTotals; items: CalcItemOut[] };

const DEMO_ERR = 'demo: nutrientcontent microservice is not included in the public demo';

export async function searchFoods(): Promise<SearchHit[]> {
  throw new NutrientContentError(DEMO_ERR, 501);
}

export async function fetchFoodDetail(): Promise<FoodDetail> {
  throw new NutrientContentError(DEMO_ERR, 501);
}

export async function searchFoodsByVector(): Promise<VectorHit[]> {
  throw new NutrientContentError(DEMO_ERR, 501);
}

export async function calculate(): Promise<CalcResponse> {
  throw new NutrientContentError(DEMO_ERR, 501);
}

export async function searchFoodsCached(): Promise<SearchHit[]> {
  throw new NutrientContentError(DEMO_ERR, 501);
}

export async function searchFoodsByVectorCached(): Promise<VectorHit[]> {
  throw new NutrientContentError(DEMO_ERR, 501);
}

export async function fetchFoodDetailCached(): Promise<FoodDetail> {
  throw new NutrientContentError(DEMO_ERR, 501);
}
