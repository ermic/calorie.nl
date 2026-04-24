import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { z } from 'zod';
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

const SaveSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  eatenAt: z.string().datetime().optional(),
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

  // Find or create dayLog voor (user, dag). user-filter via access-control
  // zou strikt genomen redundant zijn, maar we overschrijven niets client-side.
  const existing = await payload.find({
    collection: 'dayLogs',
    where: { and: [{ user: { equals: user.id } }, { date: { equals: dayIso } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  });

  // Unique-index op (user, date) kan races geven bij parallele submits —
  // probeer create, bij 'duplicate key' re-find en gebruik die.
  async function findOrCreateDayLog() {
    if (existing.docs[0]) return existing.docs[0];
    try {
      return await payload.create({
        collection: 'dayLogs',
        data: { user: user!.id, date: dayIso },
        overrideAccess: false,
        user: user!,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!/duplicate|unique/i.test(message)) throw err;
      const retry = await payload.find({
        collection: 'dayLogs',
        where: { and: [{ user: { equals: user!.id } }, { date: { equals: dayIso } }] },
        limit: 1,
        depth: 0,
        overrideAccess: false,
        user: user!,
      });
      if (retry.docs[0]) return retry.docs[0];
      throw err;
    }
  }

  const dayLog = await findOrCreateDayLog();

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
    user,
  });

  // Items sequentieel — verifyMealBelongsToUser hook valideert elk item.
  for (const item of data.items) {
    await payload.create({
      collection: 'mealItems',
      data: { ...item, meal: meal.id },
      overrideAccess: false,
      user,
    });
  }

  return NextResponse.json({ mealId: meal.id });
}
