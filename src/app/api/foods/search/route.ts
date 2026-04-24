import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import { normalizeOFFProduct, searchProducts } from '@/shared/api/openFoodFacts';
import type { FoodSearchHit } from '@/entities/food';

export const runtime = 'nodejs';

const MAX_LIMIT = 20;
const MIN_QUERY = 2;
const MAX_QUERY = 100;

export type FoodSearchResponse = { results: FoodSearchHit[]; offAvailable: boolean };

export async function GET(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const requestedLimit = Number(url.searchParams.get('limit') ?? '10');
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10));

  if (q.length < MIN_QUERY || q.length > MAX_QUERY) {
    return NextResponse.json<FoodSearchResponse>({ results: [], offAvailable: true });
  }

  // 'contains' mapt naar ILIKE met auto-wrapping (%q%) en escaping van
  // wildcards — voorkomt dat een user '%'-glob submit en de hele tabel
  // matcht. Ook case-insensitive, beter voor zoek-UX dan 'like'.
  const localPromise = payload.find({
    collection: 'foods',
    where: { name: { contains: q } },
    limit,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  });

  const offPromise = searchProducts(q, limit).then(
    (r) => ({ ok: true as const, products: r.products }),
    (err) => {
      console.warn('[foods/search] OFF fallback mislukt:', err);
      return { ok: false as const, products: [] };
    },
  );

  const [{ docs: local }, off] = await Promise.all([localPromise, offPromise]);

  const results: FoodSearchHit[] = local.map((f) => ({
    source: 'local',
    id: f.id,
    barcode: f.barcode ?? null,
    name: f.name,
    brand: f.brand ?? null,
    caloriesPer100: f.caloriesPer100,
    proteinPer100: f.proteinPer100 ?? 0,
    carbsPer100: f.carbsPer100 ?? 0,
    fatPer100: f.fatPer100 ?? 0,
  }));

  if (results.length < limit) {
    const seenBarcodes = new Set(results.map((r) => r.barcode).filter(Boolean));
    for (const p of off.products) {
      if (!p.code || seenBarcodes.has(p.code)) continue;
      const n = normalizeOFFProduct(p);
      if (!n.caloriesPer100 && !n.proteinPer100 && !n.carbsPer100 && !n.fatPer100) continue;
      results.push({
        source: 'off',
        id: null,
        barcode: n.barcode,
        name: n.name,
        brand: n.brand,
        caloriesPer100: n.caloriesPer100,
        proteinPer100: n.proteinPer100,
        carbsPer100: n.carbsPer100,
        fatPer100: n.fatPer100,
      });
      if (results.length >= limit) break;
    }
  }

  return NextResponse.json<FoodSearchResponse>({ results, offAvailable: off.ok });
}
