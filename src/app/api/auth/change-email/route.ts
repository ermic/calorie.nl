import { NextResponse } from 'next/server';
import type { PayloadRequest } from 'payload';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { ChangeEmailSchema } from '@/shared/lib/schemas';
import { generateToken, hashToken } from '@/shared/lib/tokens';
import { requireServerUrl } from '@/shared/lib/server-url';
import { changeEmailConfirmEmail } from '@/shared/email/changeEmailConfirm';
import { changeEmailNoticeEmail } from '@/shared/email/changeEmailNotice';

export const runtime = 'nodejs';

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// Twee aparte rate-limits per user:
// - failedVerifies: max 10 fout-current-password-pogingen / 15 min
//   → beschermt tegen brute-force met geldige sessie.
// - successfulStarts: max 3 succesvolle change-aanvragen / 15 min →
//   beschermt tegen mail-bombing (elke aanvraag stuurt 2 mails: notify
//   naar oud + confirm naar nieuw, dus 6 mails / 15 min max).
const failedVerifies = new Map<string, number[]>();
const FAILED_LIMIT = 10;

const successfulStarts = new Map<string, number[]>();
const STARTS_LIMIT = 3;

function isLockedOut(map: Map<string, number[]>, limit: number, userId: string, now: number): boolean {
  const stamps = map.get(userId)?.filter((t) => now - t < ATTEMPT_WINDOW_MS) ?? [];
  if (stamps.length === 0) {
    map.delete(userId);
    return false;
  }
  map.set(userId, stamps);
  return stamps.length >= limit;
}

function recordEvent(map: Map<string, number[]>, userId: string, now: number): void {
  const stamps = map.get(userId)?.filter((t) => now - t < ATTEMPT_WINDOW_MS) ?? [];
  stamps.push(now);
  map.set(userId, stamps);
  if (map.size > 1000) {
    for (const [k, v] of map) {
      if (v.every((t) => now - t > ATTEMPT_WINDOW_MS)) map.delete(k);
    }
  }
}

// Start een e-mailwijziging. Verwacht re-auth via huidig wachtwoord;
// genereert twee tokens (confirm + revoke), stuurt een bevestigingsmail
// naar het NIEUWE adres en een waarschuwingsmail naar het OUDE adres.
// Het account-e-mailadres verandert pas na de confirm-klik.
export async function POST(request: Request) {
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const userId = String(user.id);
  const now = Date.now();

  if (isLockedOut(failedVerifies, FAILED_LIMIT, userId, now)) {
    return NextResponse.json(
      { error: 'Te veel mislukte pogingen. Probeer over 15 minuten opnieuw.' },
      { status: 429 },
    );
  }
  if (isLockedOut(successfulStarts, STARTS_LIMIT, userId, now)) {
    return NextResponse.json(
      { error: 'Te veel wijzigingsaanvragen. Probeer over 15 minuten opnieuw.' },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = ChangeEmailSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? 'Ongeldige invoer' },
      { status: 400 },
    );
  }
  const { newEmail, currentPassword } = parsed.data;
  const normalizedNew = newEmail.trim().toLowerCase();

  if (normalizedNew === user.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Dit is al je huidige e-mailadres.' },
      { status: 400 },
    );
  }

  // Uniek-check: voorkom dat een wijziging aangevraagd wordt naar een
  // adres dat al bij een ander account hoort. Generieke melding zodat
  // we geen bestaande accounts onthullen aan de aanvrager.
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: normalizedNew } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    return NextResponse.json(
      { error: 'Dit e-mailadres is niet beschikbaar.' },
      { status: 400 },
    );
  }

  // Pre-reset Payload's loginAttempts: typo's op deze knop mogen niet
  // de account-lock op /api/users/login triggeren (zie change-password).
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
    recordEvent(failedVerifies, userId, now);
    return NextResponse.json(
      { error: 'Huidig wachtwoord is onjuist.' },
      { status: 400 },
    );
  }
  failedVerifies.delete(userId);

  const confirmToken = generateToken();
  const revokeToken = generateToken();
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = requireServerUrl();

  // Atomic delete + 2× create binnen één tx. Twee parallelle change-
  // email-aanvragen zien elkaars tokens nog niet (READ COMMITTED), maar
  // de tx-wrap voorkomt dat we halverwege orphan tokens achterlaten als
  // één van de creates faalt. Volledige race-bescherming tegen parallel
  // requests vereist een unique partial index op (user_id, kind) — zie
  // FOLLOW_UPS.
  const transactionID = await payload.db.beginTransaction();
  if (transactionID === undefined || transactionID === null) {
    return NextResponse.json(
      { error: 'Database ondersteunt geen transacties; aanvraag geannuleerd.' },
      { status: 500 },
    );
  }
  const txReq = { transactionID } as unknown as PayloadRequest;

  try {
    await payload.delete({
      collection: 'emailVerifications',
      where: {
        and: [
          { userId: { equals: userId } },
          { kind: { in: ['change-confirm', 'change-revoke'] } },
        ],
      },
      overrideAccess: true,
      req: txReq,
    });

    await payload.create({
      collection: 'emailVerifications',
      overrideAccess: true,
      req: txReq,
      data: {
        tokenHash: hashToken(confirmToken),
        userId,
        kind: 'change-confirm',
        newEmail: normalizedNew,
        expiresAt,
      },
    });
    await payload.create({
      collection: 'emailVerifications',
      overrideAccess: true,
      req: txReq,
      data: {
        tokenHash: hashToken(revokeToken),
        userId,
        kind: 'change-revoke',
        newEmail: normalizedNew,
        expiresAt,
      },
    });

    await payload.db.commitTransaction(transactionID);
  } catch (err) {
    await payload.db.rollbackTransaction(transactionID).catch(() => {});
    payload.logger.error({ err, userId }, 'change-email tx failed');
    return NextResponse.json(
      { error: 'Aanvraag mislukt. Probeer opnieuw.' },
      { status: 500 },
    );
  }

  // Cap mail-send op 10s en cleanup tokens bij failure: we willen geen
  // orphan tokens in DB en geen 30s-hangende request. Bij failure: 502
  // zodat de UI er duidelijk over kan zijn en de user opnieuw kan
  // proberen.
  try {
    await Promise.race([
      (async () => {
        await payload.sendEmail({
          to: normalizedNew,
          subject: 'Bevestig je nieuwe e-mailadres — Calorietje',
          html: changeEmailConfirmEmail({
            name: user.name ?? null,
            link: `${baseUrl}/api/auth/confirm-email-change?token=${confirmToken}`,
          }),
        });
        await payload.sendEmail({
          to: user.email,
          subject: 'E-mailwijziging aangevraagd — Calorietje',
          html: changeEmailNoticeEmail({
            name: user.name ?? null,
            newEmail: normalizedNew,
            revokeLink: `${baseUrl}/api/auth/revoke-email-change?token=${revokeToken}`,
          }),
        });
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout')), 10_000),
      ),
    ]);
  } catch (err) {
    payload.logger.error({ err, userId }, 'change-email mail failed');
    await payload.delete({
      collection: 'emailVerifications',
      where: {
        and: [
          { userId: { equals: userId } },
          { kind: { in: ['change-confirm', 'change-revoke'] } },
        ],
      },
      overrideAccess: true,
    });
    return NextResponse.json(
      { error: 'Mail kon niet verstuurd worden. Probeer over enkele minuten opnieuw.' },
      { status: 502 },
    );
  }

  // Pas hier de succesvolle-aanvraag-teller bijwerken: na complete flow.
  recordEvent(successfulStarts, userId, now);

  return NextResponse.json({ ok: true });
}
