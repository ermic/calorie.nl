import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';
import { fetchMealsPage } from '@/views/meals-list/fetch-meals';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

// GET /api/meals?offset=0&limit=30 → pagineerbare lijst van de EIGEN meals
// van de aanvragende user. fetchMealsPage scoped strikt op user.id +
// overrideAccess:false, dus geen cross-user leaks.
export async function GET(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const url = new URL(req.url);
  const rawOffset = Number(url.searchParams.get('offset') ?? '0');
  const rawLimit = Number(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT));
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : DEFAULT_LIMIT));

  const page = await fetchMealsPage({ user, offset, limit });
  return NextResponse.json(page);
}
