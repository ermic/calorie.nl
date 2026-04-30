import { expect, test, type APIRequestContext } from '@playwright/test';
import { TEST_USERS } from '../setup/users';
import { authHeaders, loginApi } from '../setup/login-helper';

// Tests voor de hard-delete-flow. Gebruikt user 'e' die idempotent
// gere-create wordt door global-setup (ensureUser handelt 'email
// already exists' graceful af).

async function ensureUserExists(request: APIRequestContext) {
  // Best-effort recreate van user e na een vorige succesvolle delete.
  // 400 met 'email must be unique' = al aanwezig, ook OK.
  await request.post('/api/users', {
    data: TEST_USERS.e,
  });
}

test.describe('delete-account', () => {
  test.beforeEach(async ({ request }) => {
    await ensureUserExists(request);
  });

  test('POST zonder login → 401', async ({ request }) => {
    const res = await request.post('/api/auth/account/delete', {
      data: { currentPassword: TEST_USERS.e.password, confirm: 'VERWIJDER' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST met fout wachtwoord → 400', async ({ request }) => {
    const token = await loginApi(request, 'e');
    const res = await request.post('/api/auth/account/delete', {
      headers: authHeaders(token),
      data: { currentPassword: 'fout', confirm: 'VERWIJDER' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST zonder VERWIJDER-confirm → 400', async ({ request }) => {
    const token = await loginApi(request, 'e');
    const res = await request.post('/api/auth/account/delete', {
      headers: authHeaders(token),
      data: { currentPassword: TEST_USERS.e.password, confirm: 'verwijder' },
    });
    expect(res.status()).toBe(400);
  });

  test('Happy path: POST → 200, daarna login faalt → 401', async ({ request }) => {
    const token = await loginApi(request, 'e');
    const res = await request.post('/api/auth/account/delete', {
      headers: authHeaders(token),
      data: { currentPassword: TEST_USERS.e.password, confirm: 'VERWIJDER' },
    });
    expect(res.status(), `body: ${await res.text().catch(() => '?')}`).toBe(200);

    // Login met dezelfde creds moet falen — user is weg.
    const loginRes = await request.post('/api/users/login', {
      data: { email: TEST_USERS.e.email, password: TEST_USERS.e.password },
    });
    expect(loginRes.status()).toBe(401);
  });
});
