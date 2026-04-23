const OFF_BASE = 'https://world.openfoodfacts.org';

export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
  };
  serving_quantity?: number;
  serving_size?: string;
  image_url?: string;
}

export interface OFFSearchResult {
  products: OFFProduct[];
  count: number;
}

export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.status === 1 ? data.product : null;
  } catch (err) {
    console.error('OFF barcode lookup failed:', err);
    return null;
  }
}

export async function searchProducts(query: string, pageSize = 20): Promise<OFFSearchResult> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      page_size: String(pageSize),
      fields: 'code,product_name,brands,nutriments,serving_quantity,serving_size,image_url',
      json: '1',
    });
    const res = await fetch(`${OFF_BASE}/cgi/search.pl?${params}`, {
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return { products: [], count: 0 };
    const data = await res.json();
    return { products: data.products ?? [], count: data.count ?? 0 };
  } catch (err) {
    console.error('OFF search failed:', err);
    return { products: [], count: 0 };
  }
}

export function normalizeOFFProduct(p: OFFProduct) {
  const n = p.nutriments ?? {};
  return {
    barcode: p.code,
    name: p.product_name ?? 'Onbekend product',
    brand: p.brands ?? null,
    caloriesPer100: n['energy-kcal_100g'] ?? 0,
    proteinPer100: n.proteins_100g ?? 0,
    carbsPer100: n.carbohydrates_100g ?? 0,
    fatPer100: n.fat_100g ?? 0,
    fiberPer100: n.fiber_100g ?? 0,
    sugarPer100: n.sugars_100g ?? 0,
    servingSize: p.serving_quantity ?? null,
    servingUnit: p.serving_size ?? null,
  };
}
