import type { APIRequestContext, Page } from '@playwright/test';
import { TEST_USERS } from './users';

export type TestUserKey = keyof typeof TEST_USERS;

// Login via UI gebruiken we voor alle tests die door de page navigeren.
// Cookies werken voor SSR-pages maar in custom REST-routes (bv.
// /api/meals/save) accepteert payload.auth({ headers }) ze momenteel
// niet — een Authorization-header met de JWT werkt wèl. Zie
// FOLLOW_UPS.md.
export async function login(page: Page, key: TestUserKey): Promise<void> {
  const user = TEST_USERS[key];
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Wachtwoord').fill(user.password);
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await page.waitForURL('/');
}

// Voor tests die /api/* direct aanroepen via Playwright's APIRequestContext.
// Doet login en retourneert een JWT die de caller als Authorization header
// kan meegeven.
export async function loginApi(request: APIRequestContext, key: TestUserKey): Promise<string> {
  const user = TEST_USERS[key];
  const res = await request.post('/api/users/login', {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    throw new Error(`Login mislukt voor ${user.email}: ${res.status()}`);
  }
  const body = await res.json();
  if (!body.token) throw new Error(`Login response zonder token voor ${user.email}`);
  return body.token as string;
}

// Helper om een ingelogde request-call te doen met Bearer-token.
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `JWT ${token}` };
}
