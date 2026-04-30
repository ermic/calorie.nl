// Verifieert dat een door createSessionForUser-uitgegeven JWT geaccepteerd
// wordt door Payload's auth + dat de session-cap werkt.
// Gebruik: pnpm exec payload run scripts/smoketest-issue-session.ts <email>

import { getPayload } from 'payload';
import config from '../src/payload.config';
import { createSessionForUser } from '../src/shared/lib/sessions';

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

const before = await payload.db.drizzle.execute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (await import('@payloadcms/db-postgres')).sql`SELECT count(*)::int AS c FROM users_sessions WHERE _parent_id = ${user.id}` as any,
);
const beforeCount = Number((before as { rows: { c: number }[] }).rows[0]?.c ?? 0);

const session = await createSessionForUser(user);

const after = await payload.db.drizzle.execute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (await import('@payloadcms/db-postgres')).sql`SELECT count(*)::int AS c FROM users_sessions WHERE _parent_id = ${user.id}` as any,
);
const afterCount = Number((after as { rows: { c: number }[] }).rows[0]?.c ?? 0);

console.log(`sessions count: ${beforeCount} → ${afterCount} (cap = 10)`);
console.log(`token=${session.token.slice(0, 40)}...`);

const headers = new Headers();
headers.set('authorization', `JWT ${session.token}`);
const result = await payload.auth({ headers });
console.log(`auth.user=${result.user ? `${result.user.email} (id=${result.user.id})` : 'null'}`);

if (!result.user) {
  console.error('❌ payload.auth herkende ons zelf-gesignede JWT NIET — issueSession is kapot.');
  process.exit(1);
}
if (afterCount > 10) {
  console.error(`❌ Cap niet gerespecteerd — ${afterCount} sessions na issue.`);
  process.exit(1);
}
console.log('✅ JWT wordt geaccepteerd en cap-op-10 werkt.');
