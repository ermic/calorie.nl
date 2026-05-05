import { NextRequest, NextResponse } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { z } from 'zod';
import type { PayloadRequest } from 'payload';
import { getPayload } from '@/shared/lib/payload';
import { DEFAULT_TIMEZONE, startOfDayInTimezone } from '@/shared/lib/timezone';
import { MEAL_TITLE_MAX_LENGTH } from '@/entities/meal';

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

// Pipeline-debug + aiSnapshot zijn vrije JSON. We accepteren `unknown`
// (z.any) omdat het puur archief-data is voor latere model-tuning — een
// strakke shape afdwingen heeft hier geen waarde en zou updates aan de
// pipeline aan een endpoint-deploy koppelen. Wel een hard payload-cap
// zodat een bug in de logger geen multi-MB-rij in de DB schiet.
const PIPELINE_LOG_MAX_ENTRIES = 500;
const AI_SNAPSHOT_MAX_BYTES = 64 * 1024;
const PIPELINE_DEBUG_MAX_BYTES = 256 * 1024;
// Client genereert een 256×256 WebP-thumb (zware compressie), typisch
// 5-15KB als data-URL. Cap ruim op 60KB zodat raar-geformatteerde
// foto's (transparantie, fotosynthese-prints) ook door de check
// komen, maar een gecrafte multi-MB-string niet de DB instuurt.
//
// JPEG-fallback voor iOS Safari < 16 / sommige iOS PWA-WebViews die
// canvas.toDataURL('image/webp') niet honoreren.
const PHOTO_THUMB_MAX_LENGTH = 60_000;
const PHOTO_THUMB_PREFIXES = [
  'data:image/webp;base64,',
  'data:image/jpeg;base64,',
] as const;

const PipelineEntrySchema = z.object({
  ts: z.number(),
  level: z.enum(['info', 'warn', 'error']),
  message: z.string().max(2000),
  data: z.unknown().optional(),
});

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
  // Korte NL-samenvatting (AI of door user bewerkt). Optioneel: handmatige
  // flow stuurt 'm niet mee. Cap = DB-kolomgrootte (varchar 120) — strakke
  // limiet ipv ongelimiteerd zodat een gehackte client geen kilobytes per
  // meal kan opslaan. Lege/whitespace-strings worden naar undefined
  // genormaliseerd zodat de DB null krijgt ipv een lege titel.
  title: z
    .string()
    .max(MEAL_TITLE_MAX_LENGTH)
    .transform((v) => {
      const t = v.trim();
      return t.length === 0 ? undefined : t;
    })
    .optional(),
  aiAnalyzed: z.boolean().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
  userRating: z.number().int().min(1).max(5).optional(),
  aiSnapshot: z.unknown().optional(),
  pipelineDebug: z.array(PipelineEntrySchema).max(PIPELINE_LOG_MAX_ENTRIES).optional(),
  photoThumb: z
    .string()
    .max(PHOTO_THUMB_MAX_LENGTH)
    .refine(
      (v) => PHOTO_THUMB_PREFIXES.some((p) => v.startsWith(p)),
      'photoThumb moet een WebP- of JPEG-data-URL zijn',
    )
    .optional(),
  items: z.array(ItemSchema).min(1).max(50),
});

function jsonByteSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

type SaveItem = z.infer<typeof ItemSchema>;

// Upsert per-100g Food-docs voor de items in deze meal. Dedup-by-name
// (case-insensitive) binnen één save zodat dubbele namen in dezelfde
// meal niet twee Food-rows aanmaken. Bestaande Foods worden niet
// overschreven — als de gebruiker hetzelfde 'brood' later met andere
// macros invoert, is dat een tweede meal-item maar geen tweede food-doc.
// Skip per-100g upsert voor items met heel kleine quantity — dat
// genereert macro-extremen (bv. 0.5 g kruidenmix → 2000 kcal/100g) die
// in een volgende search hinderlijk groot lijken.
const MIN_QUANTITY_FOR_FOOD_UPSERT = 5;

async function upsertFoodsFromItems(
  payload: Awaited<ReturnType<typeof getPayload>>,
  txReq: PayloadRequest,
  items: SaveItem[],
): Promise<void> {
  const candidates = new Map<
    string,
    { name: string; caloriesPer100: number; proteinPer100: number; carbsPer100: number; fatPer100: number }
  >();
  for (const item of items) {
    const name = item.name.trim();
    if (!name || item.unit !== 'g' || item.quantity < MIN_QUANTITY_FOR_FOOD_UPSERT) continue;
    const key = name.toLowerCase();
    if (candidates.has(key)) continue;
    const factor = 100 / item.quantity;
    candidates.set(key, {
      name,
      caloriesPer100: Math.round(item.calories * factor),
      proteinPer100: Math.round(item.protein * factor * 10) / 10,
      carbsPer100: Math.round(item.carbs * factor * 10) / 10,
      fatPer100: Math.round(item.fat * factor * 10) / 10,
    });
  }
  if (candidates.size === 0) return;

  // Payload's 'equals' is case-sensitive op Postgres → 'brood' matcht
  // niet 'Brood'. Gebruik 'contains' (mapt naar ILIKE %name%) voor een
  // bredere set en filter daarna exact case-insensitive in JS, anders
  // ontstaan duplicaten zoals 'brood' / 'Brood' / 'BROOD'.
  const orQueries = Array.from(candidates.values()).map((c) => ({ name: { contains: c.name } }));
  const existing = await payload.find({
    collection: 'foods',
    where: { or: orQueries },
    limit: candidates.size * 5,
    depth: 0,
    pagination: false,
    req: txReq,
  });
  const existingNamesLowered = new Set(
    existing.docs
      .map((f) => f.name.toLowerCase())
      .filter((lower) => candidates.has(lower)),
  );

  const toCreate = Array.from(candidates.entries())
    .filter(([key]) => !existingNamesLowered.has(key))
    .map(([, food]) => food);

  // Foods.access.create = loggedInCreate; txReq.user is gezet. De
  // forceOwnerUser-hook (PR #21) pakt user.id op uit txReq voor
  // createdBy — privacy-laag werkt dus alleen wanneer #21 gemerged is.
  await Promise.all(
    toCreate.map((food) =>
      payload.create({
        collection: 'foods',
        data: { ...food, source: 'USER' },
        req: txReq,
      }),
    ),
  );
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

  // Hard cap op archief-payloads — voorkomt dat een bug in de client-
  // logger megabytes aan junk de DB instuurt. Cap = drop, niet 400:
  // de meal moet sowieso opgeslagen worden, het is metadata.
  const aiSnapshot =
    data.aiSnapshot !== undefined && jsonByteSize(data.aiSnapshot) <= AI_SNAPSHOT_MAX_BYTES
      ? data.aiSnapshot
      : undefined;
  const pipelineDebug =
    data.pipelineDebug !== undefined && jsonByteSize(data.pipelineDebug) <= PIPELINE_DEBUG_MAX_BYTES
      ? data.pipelineDebug
      : undefined;

  const eatenAt = data.eatenAt ? new Date(data.eatenAt) : new Date();
  // dayLog-bucket = midnight in user-tz (als UTC-instant). Anders zou
  // een server in UTC een meal van 00:30 NL (= 22:30 UTC vorige dag)
  // op de verkeerde dagrij plaatsen.
  const dayIso = startOfDayInTimezone(eatenAt, user.timezone || DEFAULT_TIMEZONE).toISOString();

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
        title: data.title,
        aiAnalyzed: data.aiAnalyzed,
        aiConfidence: data.aiConfidence,
        userRating: data.userRating,
        photoUrl: data.photoThumb,
        // Payload's JSON-veld accepteert primitives/array/object; we hebben
        // hierboven via z.unknown() gevalideerd + size-cap. Cast omdat de
        // gegenereerde Payload-type strikter is dan zod's unknown.
        aiSnapshot: aiSnapshot as Record<string, unknown> | unknown[] | undefined,
        pipelineDebug: pipelineDebug as unknown[] | undefined,
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

    // Bouw een persoonlijke food-bibliotheek op: dedup-by-name binnen
    // dezelfde meal, sla per-100g-waardes op zodat een toekomstige
    // search '/api/foods/search?q=brood' deze entry vindt. Alleen voor
    // unit==='g'-items, omdat per-100g math anders nergens op slaat
    // (bv. '3 sneetjes' kan niet naar '100g' geschaald). Voor andere
    // units tekort: feature-scope, niet kritisch.
    //
    // Geïsoleerde try/catch: meal-save is hoofdzaak, food-bibliotheek
    // bijzaak. Een logica-fout in de upsert (bv. zod-validatie) mag de
    // meal niet rollback'en. SQL-fouten zetten de tx alsnog in aborted
    // state — dan faalt commitTransaction hieronder, wat de outer catch
    // opvangt en correct rolled.
    try {
      await upsertFoodsFromItems(payload, txReq, data.items);
    } catch (foodErr) {
      console.warn('[meals/save] food-upsert overgeslagen:', foodErr);
    }

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
