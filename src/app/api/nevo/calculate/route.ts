import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { z } from 'zod';
import { getPayload } from '@/shared/lib/payload';
import {
  NutrientContentError,
  calculate,
  fetchFoodDetailCached,
  type FoodDetail,
} from '@/shared/api/nutrientcontent';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  items: z
    .array(
      z.object({
        nevoCode: z.number().int().positive(),
        grams: z.number().positive().max(5000),
      }),
    )
    .min(1)
    .max(50),
});

export type CalculateItemOut = {
  nevo_code: number;
  name_nl: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type CalculateResponse = {
  totals: {
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
  items: CalculateItemOut[];
};

function macroPer100(detail: FoodDetail, code: 'PROT' | 'FAT' | 'CHO'): number {
  return detail.nutrients.find((n) => n.code === code)?.value_per_100 ?? 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function POST(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten() }, { status: 400 });
  }
  const { items: input } = parsed.data;

  // /calculate geeft per item alleen kcal. Voor protein/fat/carbs per
  // item halen we /foods/{code} parallel op (cached) en rekenen lineair
  // om naar de gevraagde grams.
  try {
    const [calc, details] = await Promise.all([
      calculate(input.map((i) => ({ nevo_code: i.nevoCode, grams: i.grams }))),
      Promise.all(input.map((i) => fetchFoodDetailCached(i.nevoCode))),
    ]);

    const detailByCode = new Map(details.map((d) => [d.nevo_code, d]));
    const itemsOut: CalculateItemOut[] = calc.items.map((it) => {
      const detail = detailByCode.get(it.nevo_code);
      if (!detail) {
        // Mag niet voorkomen: input-codes zijn allemaal opgevraagd; vangt
        // race-condities af waarbij een code tussendoor wordt verwijderd.
        return {
          nevo_code: it.nevo_code,
          name_nl: it.name_nl,
          grams: it.grams,
          kcal: it.kcal,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        };
      }
      const factor = it.grams / 100;
      return {
        nevo_code: it.nevo_code,
        name_nl: it.name_nl,
        grams: it.grams,
        kcal: it.kcal,
        protein_g: round1(macroPer100(detail, 'PROT') * factor),
        carbs_g: round1(macroPer100(detail, 'CHO') * factor),
        fat_g: round1(macroPer100(detail, 'FAT') * factor),
      };
    });

    return NextResponse.json<CalculateResponse>({ totals: calc.totals, items: itemsOut });
  } catch (err) {
    if (err instanceof NutrientContentError) {
      if (err.status === 422) {
        return NextResponse.json({ error: 'NEVO_VALIDATION', detail: err.message }, { status: 422 });
      }
      return NextResponse.json({ error: 'NEVO_UNAVAILABLE' }, { status: 503 });
    }
    console.error('[nevo/calculate] unexpected error', err);
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 });
  }
}
