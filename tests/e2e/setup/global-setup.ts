import type { FullConfig } from '@playwright/test';
import { TEST_USERS } from './users';

const PORT = Number(process.env.E2E_PORT ?? 3001);
const BASE_URL = `http://localhost:${PORT}`;

// Wacht tot de dev-server reageert op een eenvoudige GET; Playwright's
// webServer geeft 'm al een lange runway, deze poll vangt eventuele
// resterende boot-tijd op zodat de eerste registreer-call niet ECONNREFUSED.
async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/login`, { method: 'GET' });
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Dev-server reageert niet binnen 60s');
}

async function ensureUser(user: { email: string; password: string; name: string }): Promise<void> {
  // Probeer registratie; als de email al bestaat krijgen we 400 — dat is
  // OK, betekent dat een vorige run de user al gemaakt heeft.
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (res.ok) return;
  const text = await res.text();
  // Payload returnt 400 met 'email must be unique' bij conflict. Andere
  // statussen zijn echte fouten en moeten breken.
  if (res.status === 400 && /unique|already/i.test(text)) return;
  throw new Error(`Kon test-user ${user.email} niet seeden (${res.status}): ${text}`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await waitForServer();
  await Promise.all([
    ensureUser(TEST_USERS.a),
    ensureUser(TEST_USERS.b),
    ensureUser(TEST_USERS.c),
    ensureUser(TEST_USERS.d),
  ]);
}
