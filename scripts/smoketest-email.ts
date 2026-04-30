// Verstuurt een testmail via Payload's geconfigureerde mailer.
// Gebruik: pnpm exec payload run scripts/smoketest-email.ts <ontvanger>

import { getPayload } from 'payload';
import config from '../src/payload.config';

const to = process.argv[2];
if (!to) {
  console.error('Usage: pnpm exec payload run scripts/smoketest-email.ts <ontvanger>');
  process.exit(1);
}

const payload = await getPayload({ config });
await payload.sendEmail({
  to,
  subject: 'Calorietje mailer-smoketest',
  text: 'Als je dit ziet, werkt de Payload-mailer.',
  html: '<p>Als je dit ziet, werkt de Payload-mailer.</p>',
});
console.log(`✅ Mail verstuurd naar ${to}`);
process.exit(0);
