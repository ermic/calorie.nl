// Triggert Payload's forgot-password flow voor een bestaande user en
// stuurt de herstel-mail. Gebruik: pnpm exec payload run scripts/smoketest-forgot-password.ts <email>

import { getPayload } from 'payload';
import config from '../src/payload.config';

const email = process.argv[2];
if (!email) {
  console.error('Usage: pnpm exec payload run scripts/smoketest-forgot-password.ts <email>');
  process.exit(1);
}

const payload = await getPayload({ config });
const token = await payload.forgotPassword({
  collection: 'users',
  data: { email },
});
console.log(`✅ forgot-password gevraagd voor ${email}`);
console.log(`Token: ${token}`);
console.log(`Reset-URL: ${process.env.NEXT_PUBLIC_SERVER_URL}/reset-password?token=${token}`);
process.exit(0);
