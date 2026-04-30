import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getPayload } from '@/shared/lib/payload';
import { getRpId, CHALLENGE_TTL_MS } from '@/shared/lib/webauthn';

export const runtime = 'nodejs';

const PASSKEY_LOGIN_COOKIE = 'passkey-login-challenge';

// Eenvoudige in-memory rate-limit op /options-routes om DoS via
// challenge-creation te beperken. Per IP, 30 / 60s.
const recentHits = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

function rateLimited(ip: string, now: number): boolean {
  const stamps = recentHits.get(ip)?.filter((t) => now - t < RATE_WINDOW_MS) ?? [];
  if (stamps.length >= RATE_LIMIT) {
    recentHits.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  recentHits.set(ip, stamps);
  if (recentHits.size > 5000) {
    for (const [k, v] of recentHits) {
      if (v.every((t) => now - t > RATE_WINDOW_MS)) recentHits.delete(k);
    }
  }
  return false;
}

type Body = { email?: string };

// Stap 1 van passkey-login. Persist de challenge-id in een short-lived
// cookie zodat /verify exact die challenge kan opzoeken — voorkomt race
// tussen parallelle login-attempts.
//
// Om e-mail-enumeratie te voorkomen geven we ook bij onbekende email
// valid-uitziende options terug. De verify-stap faalt dan met
// "ongeldige passkey".
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip, Date.now())) {
    return NextResponse.json({ error: 'Te veel pogingen' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const email = body?.email?.trim().toLowerCase();
  const payload = await getPayload();

  let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;
  let userId: string | undefined;

  if (email) {
    const result = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });
    const u = result.docs[0];
    if (u) {
      userId = String(u.id);
      allowCredentials = (u.passkeyCredentials ?? []).map((c) => ({
        id: c.credentialId,
        transports: (c.transports as AuthenticatorTransport[] | null | undefined) ?? undefined,
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'preferred',
    allowCredentials,
  });

  const created = await payload.create({
    collection: 'loginChallenges',
    overrideAccess: true,
    data: {
      kind: 'webauthn-login',
      challenge: options.challenge,
      userId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_LOGIN_COOKIE, String(created.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
  });

  return NextResponse.json(options);
}
