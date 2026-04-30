// Smoketest voor de e-mailverificatie-flow. Maakt (of hergebruikt) een
// testuser, plant zelf een token (om de hook-mail-flow te omzeilen), en
// print de verify-URL. Roep de URL daarna aan met curl.
//
// Gebruik: pnpm exec payload run scripts/smoketest-verify-email.ts [email]

import { getPayload } from 'payload';
import config from '../src/payload.config';
import { generateToken, hashToken } from '../src/shared/lib/tokens';

const email = process.argv[2] ?? `smoketest-${Date.now()}@test.local`;
const password = 'smoketest1234';

const payload = await getPayload({ config });

const existing = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  overrideAccess: true,
  limit: 1,
});

let user = existing.docs[0];
if (!user) {
  user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: { email, password, name: 'Smoketest' },
  });
}

await payload.update({
  collection: 'users',
  id: user.id,
  data: { emailVerified: false },
  overrideAccess: true,
});

await payload.delete({
  collection: 'emailVerifications',
  where: { userId: { equals: String(user.id) } },
  overrideAccess: true,
});

const token = generateToken();
const tokenHash = hashToken(token);

await payload.create({
  collection: 'emailVerifications',
  overrideAccess: true,
  data: {
    tokenHash,
    userId: String(user.id),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
});

console.log(`User: ${user.email} (id=${user.id}) — emailVerified=false`);
console.log(`Token: ${token}`);
console.log(`URL: ${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/verify-email?token=${token}`);
