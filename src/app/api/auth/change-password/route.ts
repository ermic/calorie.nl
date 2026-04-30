import { NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { getCurrentSidFromCookie, revokeAllSessionsExcept } from '@/shared/lib/sessions';
import { ChangePasswordSchema } from '@/shared/lib/schemas';
import { passwordChangedEmail } from '@/shared/email/passwordChanged';

export const runtime = 'nodejs';

// Eigen rate-limit per user: max 10 mislukte pogingen per 15 min.
// Beschermt tegen brute-force op currentPassword als een aanvaller een
// geldige sessie heeft, zonder dat een typo-happy user zichzelf via
// Payload's loginAttempts kan locken (we resetten die hieronder).
// Alleen FAILED verifies tellen mee; een succesvol verandering wist de
// teller voor deze user.
const failedVerifies = new Map<string, number[]>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 10;

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
  // Lichte prune: verwijder users met enkel verlopen entries.
  if (failedVerifies.size > 1000) {
    for (const [k, v] of failedVerifies) {
      if (v.every((t) => now - t > ATTEMPT_WINDOW_MS)) failedVerifies.delete(k);
    }
  }
}

// Wijzigt het wachtwoord van de ingelogde user. Vereist re-auth via het
// huidige wachtwoord — voorkomt dat een gestolen sessiecookie het
// account permanent kan kapen. Stuurt na succes een notificatiemail.
export async function POST(request: Request) {
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
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
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? 'Ongeldige invoer' },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  // Pre-reset loginAttempts: payload.login zelf telt fouten en kan na
  // N typo's het account locken. Voor change-password (al ingelogd, eigen
  // user) is dat slechte UX — onze eigen rate-limit hierboven dekt het
  // brute-force-pad af. Reset zet loginAttempts/lockUntil terug zodat
  // een typo niet doorrolt naar een lock op /api/users/login.
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
  failedVerifies.delete(userId);

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { password: newPassword },
    overrideAccess: true,
  });

  // Forceer re-login op andere devices: revoke alle sessies behalve de
  // huidige (de cookie waarmee deze request kwam). Best-effort: bij een
  // failure is alleen sessions-revocation mis, het wachtwoord is al
  // gewijzigd.
  try {
    const currentSid = await getCurrentSidFromCookie();
    await revokeAllSessionsExcept(user.id, currentSid ?? undefined);
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'session revoke after password-change failed');
  }

  // Notificatie is niet kritisch voor de wijziging zelf — log + door.
  try {
    await payload.sendEmail({
      to: user.email,
      subject: 'Je wachtwoord is gewijzigd — Calorietje',
      html: passwordChangedEmail({ name: user.name ?? null }),
    });
  } catch (err) {
    payload.logger.error({ err, userId: user.id }, 'password-changed mail failed');
  }

  return NextResponse.json({ ok: true });
}
