import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { z } from 'zod';
import type { PayloadRequest } from 'payload';
import { getPayload } from '@/shared/lib/payload';

export const runtime = 'nodejs';

const ItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().nonnegative().max(10000),
  unit: z.string().min(1).max(20),
  calories: z.number().nonnegative().max(10000),
  protein: z.number().nonnegative().max(1000).default(0),
  carbs: z.number().nonnegative().max(1000).default(0),
  fat: z.number().nonnegative().max(1000).default(0),
});

// Backfill tot 30 dagen, tot 1 dag in de toekomst (tz-buffer). Voorkomt
// vervuilde "toekomst-meals" via gecrafte requests en houdt DayLog-
// bucketing binnen de window die dashboard/meals-list toont.
const EATEN_AT_MAX_PAST_MS = 30 * 24 * 60 * 60 * 1000;
const EATEN_AT_MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

const SaveSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  eatenAt: z
    .string()
    .datetime()
    .refine((v) => {
      const t = new Date(v).getTime();
      const now = Date.now();
      return t >= now - EATEN_AT_MAX_PAST_MS && t <= now + EATEN_AT_MAX_FUTURE_MS;
    }, 'eatenAt buiten toegestaan bereik (max 30 dagen geleden t/m 1 dag vooruit)')
    .optional(),
  aiAnalyzed: z.boolean().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
  items: z.array(ItemSchema).min(1).max(50),
});

function startOfDay(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function POST(req: NextRequest) {
  const payload = await getPayload();

  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const eatenAt = data.eatenAt ? new Date(data.eatenAt) : new Date();
  const dayIso = startOfDay(eatenAt).toISOString();

  // dayLog find-or-create gebeurt EXPLICIET buiten de transactie. Reden:
  // bij een unique-constraint-violation (twee tabs maken simultaan een
  // dayLog voor dezelfde dag) faalt de INSERT en zet Postgres de hele tx
  // in 'aborted state' — elke volgende query in die tx geeft 'current
  // transaction is aborted'. dayLogs zijn idempotent (per (user, date)
  // bestaat er hooguit één), dus losse find-or-create is veilig en
  // voorkomt savepoint-complexiteit.
  let dayLog;
  try {
    const existing = await payload.find({
      collection: 'dayLogs',
      where: { and: [{ user: { equals: user.id } }, { date: { equals: dayIso } }] },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    });
    dayLog = existing.docs[0];
    if (!dayLog) {
      try {
        dayLog = await payload.create({
          collection: 'dayLogs',
          data: { user: user.id, date: dayIso },
          overrideAccess: false,
          user,
        });
      } catch (createErr) {
        const message = createErr instanceof Error ? createErr.message : '';
        if (!/duplicate|unique/i.test(message)) throw createErr;
        const retry = await payload.find({
          collection: 'dayLogs',
          where: { and: [{ user: { equals: user.id } }, { date: { equals: dayIso } }] },
          limit: 1,
          depth: 0,
          overrideAccess: false,
          user,
        });
        dayLog = retry.docs[0];
        if (!dayLog) throw createErr;
      }
    }
  } catch (err) {
    console.error('[meals/save] dayLog find-or-create faalde:', err);
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 });
  }

  // Vanaf hier: meal + items in één transactie zodat een fout halverwege
  // niet een meal zonder items achterlaat. Een 'kale' dayLog die al dan
  // niet hierboven is aangemaakt blijft staan — geen probleem, een
  // volgende save hergebruikt 'm.
  const transactionID = await payload.db.beginTransaction();
  if (transactionID === undefined || transactionID === null) {
    return NextResponse.json(
      { error: 'Database ondersteunt geen transacties; opslaan geannuleerd.' },
      { status: 500 },
    );
  }

  const txReq = { user, transactionID } as unknown as PayloadRequest;

  try {
    const meal = await payload.create({
      collection: 'meals',
      data: {
        user: user.id,
        dayLog: dayLog.id,
        mealType: data.mealType,
        eatenAt: eatenAt.toISOString(),
        aiAnalyzed: data.aiAnalyzed,
        aiConfidence: data.aiConfidence,
      },
      overrideAccess: false,
      req: txReq,
    });

    // Items parallel — verifyMealBelongsToUser hook ziet de meal in
    // dezelfde transactie via txReq.transactionID. Bij failure binnen
    // één van de items rolled de hele transactie terug.
    await Promise.all(
      data.items.map((item) =>
        payload.create({
          collection: 'mealItems',
          data: { ...item, meal: meal.id },
          overrideAccess: false,
          req: txReq,
        }),
      ),
    );

    await payload.db.commitTransaction(transactionID);
    return NextResponse.json({ mealId: meal.id });
  } catch (err) {
    await payload.db.rollbackTransaction(transactionID).catch((rollbackErr) => {
      console.error('[meals/save] rollback faalde:', rollbackErr);
    });
    const message = err instanceof Error ? err.message : '';
    console.error('[meals/save] mislukt:', err);
    if (/permission|forbidden|access/i.test(message)) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 });
  }
}
