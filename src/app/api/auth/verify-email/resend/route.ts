import { NextResponse } from 'next/server';
import { getPayload } from '@/shared/lib/payload';
import { getRouteUser } from '@/shared/lib/route-auth';
import { generateToken, hashToken } from '@/shared/lib/tokens';
import { verifyEmail } from '@/shared/email/verifyEmail';
import { requireServerUrl } from '@/shared/lib/server-url';

export const runtime = 'nodejs';

// Eenvoudige in-memory rate-limit: 1 verzoek per minuut per user.
// Bij meerdere instances later naar Redis verplaatsen.
const recentSends = new Map<string, number>();
const COOLDOWN_MS = 60_000;
const PRUNE_THRESHOLD_MS = COOLDOWN_MS * 2;

function pruneRateLimit(now: number) {
  for (const [key, ts] of recentSends) {
    if (now - ts > PRUNE_THRESHOLD_MS) recentSends.delete(key);
  }
}

export async function POST() {
  const payload = await getPayload();
  const user = await getRouteUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ error: 'Al geverifieerd' }, { status: 400 });
  }

  const now = Date.now();
  pruneRateLimit(now);

  const userId = String(user.id);
  const last = recentSends.get(userId);
  if (last && now - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: `Wacht ${wait} seconden voor je opnieuw probeert.` },
      { status: 429 },
    );
  }

  // Oude eerste-verify rijen voor deze user opruimen. Change-confirm/
  // change-revoke tokens blijven staan — die horen bij een lopende
  // e-mailwijziging.
  await payload.delete({
    collection: 'emailVerifications',
    where: {
      and: [
        { userId: { equals: userId } },
        { kind: { equals: 'verify' } },
      ],
    },
    overrideAccess: true,
  });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await payload.create({
    collection: 'emailVerifications',
    overrideAccess: true,
    data: { tokenHash, userId, kind: 'verify', expiresAt },
  });

  // sendEmail kan trage SMTP raken; cap op 10s en vang failures af zodat
  // de route niet hangt en de user geen generieke 500 krijgt. Pas ná
  // succesvolle send de rate-limit-timestamp zetten — anders zit de user
  // 60s vast in cooldown zonder mail.
  try {
    const link = `${requireServerUrl()}/api/auth/verify-email?token=${token}`;
    await Promise.race([
      payload.sendEmail({
        to: user.email,
        subject: 'Bevestig je e-mailadres — Calorietje',
        html: verifyEmail({ name: user.name ?? null, link }),
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout')), 10_000),
      ),
    ]);
    recentSends.set(userId, now);
  } catch (err) {
    payload.logger.error({ err, userId }, 'verify-email resend failed');
    return NextResponse.json(
      { error: 'Mail kon niet verstuurd worden. Probeer over enkele minuten opnieuw.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
