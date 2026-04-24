import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { Forbidden, NotFound } from 'payload';
import { getPayload } from '@/shared/lib/payload';

export const runtime = 'nodejs';

// Payload's default DELETE laat mealItems achter met meal=NULL (ON DELETE
// SET NULL op de FK), wat resulteert in 'verweesde' items die nergens
// meer zichtbaar zijn maar wel in de DB leven. Deze route veegt items
// eerst op, daarna de meal zelf — allemaal onder overrideAccess:false
// zodat een non-admin alleen eigen meals kan verwijderen.
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const mealId = Number(rawId);
  if (!Number.isInteger(mealId) || mealId <= 0) {
    return NextResponse.json({ error: 'Ongeldig maaltijd-id' }, { status: 400 });
  }

  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  try {
    // Ownership assertion vóór cascade: als de mealItems-delete stil 0
    // rijen raakt door access-filter, zouden we anders blind doorgaan en
    // de meals-delete laten falen op 404 — maar de volgorde-invariant is
    // fragiel. findByID met overrideAccess:false gooit Forbidden/NotFound
    // op fremde meals, wat we hier expliciet op 404 mappen.
    await payload.findByID({
      collection: 'meals',
      id: mealId,
      depth: 0,
      overrideAccess: false,
      user,
    });

    await payload.delete({
      collection: 'mealItems',
      where: { meal: { equals: mealId } },
      overrideAccess: false,
      user,
    });
    await payload.delete({
      collection: 'meals',
      id: mealId,
      overrideAccess: false,
      user,
    });
  } catch (err) {
    if (err instanceof NotFound || err instanceof Forbidden) {
      return NextResponse.json({ error: 'Maaltijd niet gevonden' }, { status: 404 });
    }
    console.error('[meals/:id DELETE] mislukt:', err);
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
