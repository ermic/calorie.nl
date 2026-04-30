// Verifieert dat een door issueSessionForUser-uitgegeven JWT geaccepteerd
// wordt door Payload's auth — gevoelig voor PAYLOAD_SECRET-interpretatie
// + sessions-array shape.
// Gebruik: pnpm exec payload run scripts/smoketest-issue-session.ts <email>

import { getPayload } from 'payload';
import config from '../src/payload.config';
import { createHash, randomUUID } from 'crypto';
import { SignJWT } from 'jose';

const email = process.argv[2];
if (!email) {
  console.error('Usage: pnpm exec payload run scripts/smoketest-issue-session.ts <email>');
  process.exit(1);
}

const payload = await getPayload({ config });

const found = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
  overrideAccess: true,
});
const user = found.docs[0];
if (!user) {
  console.error(`User ${email} niet gevonden`);
  process.exit(1);
}

// Repliceer issueSessionForUser-logica zonder Next-cookies dependency.
const sid = randomUUID();
const nowS = Math.floor(Date.now() / 1000);
const expS = nowS + 60 * 60 * 2;

const fresh = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true });
const existingSessions = (fresh as { sessions?: { id: string; createdAt: string; expiresAt: string }[] }).sessions ?? [];

await payload.update({
  collection: 'users',
  id: user.id,
  overrideAccess: true,
  data: {
    sessions: [
      ...existingSessions,
      {
        id: sid,
        createdAt: new Date(nowS * 1000).toISOString(),
        expiresAt: new Date(expS * 1000).toISOString(),
      },
    ],
  },
});

const derivedSecret = createHash('sha256')
  .update(process.env.PAYLOAD_SECRET ?? '')
  .digest('hex')
  .slice(0, 32);
const secret = new TextEncoder().encode(derivedSecret);
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

// Verify wat in DB staat
const reread = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true });
const sessionsAfter = (reread as { sessions?: { id: string }[] }).sessions ?? [];
console.log(`DB sessions count after update: ${sessionsAfter.length}`);
console.log(`Our sid in sessions: ${sessionsAfter.some((s) => s.id === sid)}`);
console.log(`secret length: ${(process.env.PAYLOAD_SECRET ?? '').length}`);
console.log(`sid: ${sid}`);

// Test of de JWT geaccepteerd wordt door payload.auth
const headers = new Headers();
headers.set('authorization', `JWT ${token}`);
const result = await payload.auth({ headers });

console.log(`token=${token.slice(0, 40)}...`);
console.log(`auth.user=${result.user ? `${result.user.email} (id=${result.user.id})` : 'null'}`);

if (!result.user) {
  console.error('❌ payload.auth herkende ons zelf-gesignede JWT NIET — issueSession is kapot.');
  process.exit(1);
}
console.log('✅ JWT-format en sessions-rij worden door Payload geaccepteerd.');
