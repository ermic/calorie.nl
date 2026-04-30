import { createHash, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { getPayload } from './payload';
import type { User } from '@/payload-types';

// Default tokenExpiration uit Payload v3 = 2 uur. Houden we aan zodat
// onze zelf-gesignede tokens dezelfde half-life hebben.
const TOKEN_TTL_S = 60 * 60 * 2;
const COOKIE_NAME = 'payload-token';

// Payload v3 hasht het config.secret voor het als JWT-key gebruikt:
//   sha256(config.secret).hex.slice(0, 32)
// (zie node_modules/payload/dist/index.js — `this.secret = ...`).
// Onze zelf-gesignede JWT moet dezelfde key gebruiken anders herkent
// payload.auth het token niet.
function payloadJwtKey(): Uint8Array {
  const raw = process.env.PAYLOAD_SECRET;
  if (!raw) throw new Error('PAYLOAD_SECRET ontbreekt — kan geen sessie-token signen');
  const derived = createHash('sha256').update(raw).digest('hex').slice(0, 32);
  return new TextEncoder().encode(derived);
}

// Payload v3 sessions-mode: elk JWT bevat een `sid` die match'te tegen
// een rij in users.sessions[]. Voor OAuth/passkey-login (waar we geen
// `payload.login` met password kunnen aanroepen) signeren we de JWT zelf
// en appenden we een sessie-row aan de user. Niet ideaal — bij een
// Payload-versie-bump die het JWT-shape aanpast moeten we deze helper
// updaten — maar de minimaal-invasieve route uit AUTH_SPECS open issue #1.
export async function issueSessionForUser(user: User): Promise<void> {
  const secret = payloadJwtKey();
  const payload = await getPayload();
  const sid = randomUUID();
  const nowMs = Date.now();
  const nowS = Math.floor(nowMs / 1000);
  const expS = nowS + TOKEN_TTL_S;

  // Append-only update op de sessions-array. We halen 'm vers op zodat
  // we niet per ongeluk stale sessies van eerdere reads weer mee­schrijven.
  const fresh = await payload.findByID({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
  });
  const existingSessions =
    (fresh as { sessions?: { id: string; createdAt: string; expiresAt: string }[] }).sessions ?? [];

  await payload.update({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    data: {
      sessions: [
        ...existingSessions,
        {
          id: sid,
          createdAt: new Date(nowMs).toISOString(),
          expiresAt: new Date(expS * 1000).toISOString(),
        },
      ],
    },
  });

  const token = await new SignJWT({
    id: user.id,
    collection: 'users',
    email: user.email,
    sid,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(nowS)
    .setExpirationTime(expS)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expS * 1000),
  });
}
