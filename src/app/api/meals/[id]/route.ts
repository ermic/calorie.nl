import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { Forbidden, NotFound, type PayloadRequest } from 'payload';
import { getPayload } from '@/shared/lib/payload';

export const runtime = 'nodejs';

// Payload's default DELETE laat mealItems achter met meal=NULL (ON DELETE
// SET NULL op de FK), wat resulteert in 'verweesde' items die nergens
// meer zichtbaar zijn maar wel in de DB leven. Deze route veegt items
// eerst op, daarna de meal zelf — beide in één DB-transactie zodat een
// failure halverwege niet leidt tot een meal zonder items of items
// zonder meal.
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const mealId = Number(rawId);
  if (!Number.isInteger(mealId) || mealId <= 0) {
    return NextResponse.json({ error: 'Ongeldig maaltijd-id' }, { status: 400 });
  }

  const payload = await getPayload();
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  // Ownership assertion vóór cascade: findByID met overrideAccess:false
  // gooit Forbidden/NotFound op vreemde meals, wat we hier expliciet op
  // 404 mappen. Buiten de transactie omdat een falende find geen
  // rollback hoeft te triggeren.
  try {
    await payload.findByID({
      collection: 'meals',
      id: mealId,
      depth: 0,
      overrideAccess: false,
      user,
    });
  } catch (err) {
    if (err instanceof NotFound || err instanceof Forbidden) {
      return NextResponse.json({ error: 'Maaltijd niet gevonden' }, { status: 404 });
    }
    console.error('[meals/:id DELETE] ownership-check mislukt:', err);
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 });
  }

  const transactionID = await payload.db.beginTransaction();
  if (transactionID === undefined || transactionID === null) {
    return NextResponse.json(
      { error: 'Database ondersteunt geen transacties; verwijderen geannuleerd.' },
      { status: 500 },
    );
  }
  const txReq = { user, transactionID } as unknown as PayloadRequest;

  try {
    await payload.delete({
      collection: 'mealItems',
      where: { meal: { equals: mealId } },
      overrideAccess: false,
      req: txReq,
    });
    await payload.delete({
      collection: 'meals',
      id: mealId,
      overrideAccess: false,
      req: txReq,
    });
    await payload.db.commitTransaction(transactionID);
  } catch (err) {
    await payload.db.rollbackTransaction(transactionID).catch((rollbackErr) => {
      console.error('[meals/:id DELETE] rollback faalde:', rollbackErr);
    });
    if (err instanceof NotFound || err instanceof Forbidden) {
      return NextResponse.json({ error: 'Maaltijd niet gevonden' }, { status: 404 });
    }
    console.error('[meals/:id DELETE] mislukt:', err);
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
