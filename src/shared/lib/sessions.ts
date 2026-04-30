import { createHash, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { SignJWT, decodeJwt } from 'jose';
import { sql } from '@payloadcms/db-postgres';
import { getPayload } from './payload';
import type { User } from '@/payload-types';

// Default tokenExpiration uit Payload v3 = 2 uur. Houden we aan zodat
// onze zelf-gesignede tokens dezelfde half-life hebben.
const TOKEN_TTL_S = 60 * 60 * 2;
const COOKIE_NAME = 'payload-token';
const MAX_SESSIONS_PER_USER = 10;
const GLOBAL_CLEANUP_PROBABILITY = 0.05;

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

type IssuedSession = {
  token: string;
  sid: string;
  expiresAt: Date;
};

// Persisteert een nieuwe sessie-rij + signt de JWT, zonder cookie-set.
// Apart geëxporteerd zodat smoketests/utility-scripts hem rechtstreeks
// kunnen aanroepen buiten de Next-runtime om.
//
// Payload v3 sessions-mode: elk JWT bevat een `sid` die match'te tegen
// een rij in users.sessions[]. Voor OAuth/passkey-login (waar we geen
// `payload.login` met password kunnen aanroepen) signeren we de JWT zelf
// en INSERTen we direct in `users_sessions` — geen read-modify-write
// op de hele array (race-vrij), met cap op N meest-recente sessies per
// user en probabilistische cleanup van verlopen entries.
export async function createSessionForUser(user: User): Promise<IssuedSession> {
  const secret = payloadJwtKey();
  const payload = await getPayload();

  const sid = randomUUID();
  const nowMs = Date.now();
  const nowS = Math.floor(nowMs / 1000);
  const expS = nowS + TOKEN_TTL_S;
  const expIso = new Date(expS * 1000).toISOString();
  const nowIso = new Date(nowMs).toISOString();
  const userIdNum = typeof user.id === 'number' ? user.id : Number(user.id);

  // Atomic insert: _order is volgnummer (race op MAX+1 is acceptabel,
  // alleen voor sortering — geen unique-constraint). id is PK + uuid =
  // effectief uniek.
  await payload.db.drizzle.execute(sql`
    INSERT INTO users_sessions (id, _parent_id, _order, created_at, expires_at)
    VALUES (
      ${sid},
      ${userIdNum},
      COALESCE((SELECT MAX(_order) FROM users_sessions WHERE _parent_id = ${userIdNum}), 0) + 1,
      ${nowIso}::timestamp(3) with time zone,
      ${expIso}::timestamp(3) with time zone
    )
  `);

  // Cap op MAX_SESSIONS_PER_USER: verwijder de oudste boven die grens.
  // ORDER BY created_at DESC OFFSET N geeft alles vanaf positie N+1
  // (oudere) terug; die wissen we.
  await payload.db.drizzle.execute(sql`
    DELETE FROM users_sessions
    WHERE _parent_id = ${userIdNum} AND id IN (
      SELECT id FROM users_sessions
      WHERE _parent_id = ${userIdNum}
      ORDER BY created_at DESC
      OFFSET ${MAX_SESSIONS_PER_USER}
    )
  `);

  // Globale cleanup van verlopen sessies, ~5% van de calls.
  if (Math.random() < GLOBAL_CLEANUP_PROBABILITY) {
    await payload.db.drizzle.execute(sql`
      DELETE FROM users_sessions WHERE expires_at < NOW()
    `);
  }

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

  return { token, sid, expiresAt: new Date(expS * 1000) };
}

export async function issueSessionForUser(user: User): Promise<void> {
  const session = await createSessionForUser(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: session.expiresAt,
  });
}

// Verwijdert alle sessies van een user behalve (optioneel) één om te
// behouden — bv. de huidige sessie van degene die het wachtwoord net
// gewijzigd heeft. Zo blijft hun current device ingelogd terwijl andere
// devices automatisch een 401 krijgen.
export async function revokeAllSessionsExcept(
  userId: number | string,
  keepSid?: string,
): Promise<void> {
  const payload = await getPayload();
  const userIdNum = typeof userId === 'number' ? userId : Number(userId);
  if (keepSid) {
    await payload.db.drizzle.execute(sql`
      DELETE FROM users_sessions
      WHERE _parent_id = ${userIdNum} AND id != ${keepSid}
    `);
  } else {
    await payload.db.drizzle.execute(sql`
      DELETE FROM users_sessions WHERE _parent_id = ${userIdNum}
    `);
  }
}

// Leest de `sid` uit de huidige `payload-token` cookie. Returnt null
// als er geen valide JWT-cookie is. Decodeert zonder verificatie omdat
// we de waarde alleen gebruiken om de "huidige sessie" te identificeren
// — niet voor authenticatie.
export async function getCurrentSidFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const claims = decodeJwt(token);
    return typeof claims.sid === 'string' ? claims.sid : null;
  } catch {
    return null;
  }
}
