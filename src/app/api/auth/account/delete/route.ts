import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@payloadcms/db-postgres';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { DeleteAccountSchema } from '@/shared/lib/schemas';
import { accountDeletedEmail } from '@/shared/email/accountDeleted';

export const runtime = 'nodejs';

const PAYLOAD_TOKEN_COOKIE = 'payload-token';

// Eigen rate-limit: max 5 mislukte verifies / 15 min — beschermt tegen
// brute-force op currentPassword via een gestolen sessie. Succesvolle
// flow eindigt sowieso met een hard delete dus rate-limiting daarna is
// irrelevant.
const failedVerifies = new Map<string, number[]>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 5;

function isLockedOut(userId: string, now: number): boolean {
  const stamps = failedVerifies.get(userId)?.filter((t) => now - t < ATTEMPT_WINDOW_MS) ?? [];
  if (stamps.length === 0) {
    failedVerifies.delete(userId);
    return false;
  }
  failedVerifies.set(userId, stamps);
  return stamps.length >= ATTEMPT_LIMIT;
}

function recordFailedVerify(userId: string, now: number): void {
  const stamps = failedVerifies.get(userId)?.filter((t) => now - t < ATTEMPT_WINDOW_MS) ?? [];
  stamps.push(now);
  failedVerifies.set(userId, stamps);
}

// Verwijdert het user-account hard. Vereist re-auth via huidig
// wachtwoord — voorkomt dat een gestolen sessie het account stilletjes
// kan deleten. Stuurt een bevestigingsmail nadat de delete is gelukt
// (audit-spoor — als de user 'm niet zelf heeft geïnitieerd hoort hij
// 'm wel binnen).
export async function POST(request: Request) {
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  if (!user.hasPassword) {
    return NextResponse.json(
      {
        error:
          'Stel eerst een wachtwoord in via "Wachtwoord vergeten" voor je je account verwijdert.',
      },
      { status: 400 },
    );
  }

  const userId = String(user.id);
  const now = Date.now();
  if (isLockedOut(userId, now)) {
    return NextResponse.json(
      { error: 'Te veel mislukte pogingen. Probeer over 15 minuten opnieuw.' },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = DeleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? 'Ongeldige invoer' },
      { status: 400 },
    );
  }
  const { currentPassword } = parsed.data;

  // Pre-reset Payload's loginAttempts — typo's op deze flow mogen het
  // account niet locken op /api/users/login (zie change-password).
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { loginAttempts: 0, lockUntil: null },
    overrideAccess: true,
  });

  try {
    await payload.login({
      collection: 'users',
      data: { email: user.email, password: currentPassword },
    });
  } catch {
    recordFailedVerify(userId, now);
    return NextResponse.json(
      { error: 'Huidig wachtwoord is onjuist.' },
      { status: 400 },
    );
  }

  // Email + naam bewaren voor de notificatiemail vóór de delete.
  const userEmail = user.email;
  const userName = user.name;

  // Ruim user-bound tokens op vóór de user-delete — userId is een
  // text-veld in deze collecties (geen FK), dus ON DELETE CASCADE pakt
  // ze niet automatisch. Voorkomt GDPR-onhygiëne (data van een
  // verwijderde user blijft anders staan tot expiry).
  await payload.delete({
    collection: 'loginChallenges',
    where: { userId: { equals: userId } },
    overrideAccess: true,
  });
  await payload.delete({
    collection: 'emailVerifications',
    where: { userId: { equals: userId } },
    overrideAccess: true,
  });

  // Cascade van eigen data: meal_items (via meals), meals, day_logs.
  // Direct SQL in een Postgres-transactie zodat een failure halverwege
  // de hele actie rolled back wordt en we niet met half-verwijderde
  // accounts blijven zitten.
  //
  // We omzeilen payload.delete omdat:
  //   1. Het probeert eerst inverse-relaties op NULL te zetten, wat
  //      botst met NOT NULL op meals.user/day_logs.user.
  //   2. Payload's auto-schema-push hardcodet `onDelete: 'set null'` op
  //      relationship-FKs en kan onze ON DELETE CASCADE-migratie in dev
  //      overschrijven. App-laag-cascade leunt niet op DB-FK-state.
  //
  // foods.created_by_id heeft ON DELETE SET NULL — foods kunnen door
  // anderen gebruikt zijn, dus laten we ze staan met null-author.
  const userIdNum = typeof user.id === 'number' ? user.id : Number(user.id);
  try {
    await payload.db.drizzle.transaction(async (tx) => {
      await tx.execute(sql`
        DELETE FROM meal_items WHERE meal_id IN (
          SELECT id FROM meals WHERE user_id = ${userIdNum}
        )
      `);
      await tx.execute(sql`DELETE FROM meals WHERE user_id = ${userIdNum}`);
      await tx.execute(sql`DELETE FROM day_logs WHERE user_id = ${userIdNum}`);
      await tx.execute(sql`DELETE FROM users WHERE id = ${userIdNum}`);
    });
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'account delete failed');
    return NextResponse.json(
      { error: 'Verwijderen mislukt. Probeer opnieuw.' },
      { status: 500 },
    );
  }

  // Sessie-cookie clearen zodat de browser onmiddellijk uit-ingelogd is.
  // Andere actieve sessies (op andere devices) zijn ook geinvalideerd
  // — Postgres' ON DELETE CASCADE op users_sessions ruimt die op.
  const cookieStore = await cookies();
  cookieStore.delete(PAYLOAD_TOKEN_COOKIE);

  // Notificatiemail — niet kritisch voor het delete-resultaat zelf.
  try {
    await payload.sendEmail({
      to: userEmail,
      subject: 'Je Calorietje-account is verwijderd',
      html: accountDeletedEmail({ name: userName ?? null }),
    });
  } catch (err) {
    payload.logger.error({ err, email: userEmail }, 'account-deleted mail failed');
  }

  return NextResponse.json({ ok: true });
}
