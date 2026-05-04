import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { getPayload } from '@/shared/lib/payload';

export const runtime = 'nodejs';

// Cap zodat een gecrafte querystring niet honderden meal-rijen tegelijk
// op kan halen (en daarmee een dataset van data-URLs van >1MB veroorzaakt).
const MAX_IDS_PER_REQUEST = 100;

// GET /api/meals/thumbs?ids=1,2,3 → { thumbs: { 1: 'data:image/webp;base64,...', 2: null, ... } }
//
// Aparte endpoint zodat de meals-list-listing het photoUrl-veld (typisch
// 5-15KB per rij) NIET in de SSR-response heeft, en thumbs lazy
// achteraan binnenkomen. Strikt gescoped op de eigen user — andere
// mealIds vallen stil weg uit de response.
export async function GET(req: NextRequest) {
  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const raw = new URL(req.url).searchParams.get('ids') ?? '';
  const ids = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ).slice(0, MAX_IDS_PER_REQUEST);

  if (ids.length === 0) {
    return NextResponse.json({ thumbs: {} satisfies Record<string, string | null> });
  }

  const { docs } = await payload.find({
    collection: 'meals',
    where: { and: [{ user: { equals: user.id } }, { id: { in: ids } }] },
    select: { photoUrl: true },
    limit: ids.length,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  });

  const thumbs: Record<string, string | null> = {};
  for (const m of docs) thumbs[String(m.id)] = m.photoUrl ?? null;
  return NextResponse.json({ thumbs });
}
