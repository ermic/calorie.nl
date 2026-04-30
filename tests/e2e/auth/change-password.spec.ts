import { expect, test, type APIRequestContext } from '@playwright/test';
import { TEST_USERS } from '../setup/users';
import { authHeaders, login, loginApi } from '../setup/login-helper';

const ORIGINAL = TEST_USERS.c.password;
const TEMP = 'tijdelijk-nieuw-wachtwoord-9876';

// Best-effort reset: probeer in te loggen met TEMP en zet terug naar
// ORIGINAL. Als TEMP niet werkt, was het wachtwoord nooit gewijzigd.
async function resetPasswordToOriginal(request: APIRequestContext) {
  const login = await request.post('/api/users/login', {
    data: { email: TEST_USERS.c.email, password: TEMP },
  });
  if (!login.ok()) return;
  const { token } = await login.json();
  await request.post('/api/auth/change-password', {
    headers: authHeaders(token),
    data: {
      currentPassword: TEMP,
      newPassword: ORIGINAL,
      newPasswordConfirm: ORIGINAL,
    },
  });
}

test.describe('change-password', () => {
  test.afterEach(async ({ request }) => {
    await resetPasswordToOriginal(request);
  });

  test('API: juist huidig wachtwoord → 200 en nieuwe login werkt', async ({ request }) => {
    const token = await loginApi(request, 'c');

    const res = await request.post('/api/auth/change-password', {
      headers: authHeaders(token),
      data: { currentPassword: ORIGINAL, newPassword: TEMP, newPasswordConfirm: TEMP },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });

    const newLogin = await request.post('/api/users/login', {
      data: { email: TEST_USERS.c.email, password: TEMP },
    });
    expect(newLogin.ok()).toBe(true);

    const oldLogin = await request.post('/api/users/login', {
      data: { email: TEST_USERS.c.email, password: ORIGINAL },
    });
    expect(oldLogin.status()).toBe(401);
  });

  test('API: fout huidig wachtwoord → 400 en wachtwoord blijft', async ({ request }) => {
    const token = await loginApi(request, 'c');

    const res = await request.post('/api/auth/change-password', {
      headers: authHeaders(token),
      data: { currentPassword: 'fout-wachtwoord', newPassword: TEMP, newPasswordConfirm: TEMP },
    });
    expect(res.status()).toBe(400);

    const stillOldLogin = await request.post('/api/users/login', {
      data: { email: TEST_USERS.c.email, password: ORIGINAL },
    });
    expect(stillOldLogin.ok()).toBe(true);
  });

  test('API: niet ingelogd → 401', async ({ request }) => {
    const res = await request.post('/api/auth/change-password', {
      data: { currentPassword: ORIGINAL, newPassword: TEMP, newPasswordConfirm: TEMP },
    });
    expect(res.status()).toBe(401);
  });

  test('API: te-kort nieuw wachtwoord → 400', async ({ request }) => {
    const token = await loginApi(request, 'c');
    const res = await request.post('/api/auth/change-password', {
      headers: authHeaders(token),
      data: { currentPassword: ORIGINAL, newPassword: 'kort', newPasswordConfirm: 'kort' },
    });
    expect(res.status()).toBe(400);
  });

  test('UI: form gewijzigd → success-melding', async ({ page }) => {
    await login(page, 'c');
    await page.goto('/profile');

    const form = page.getByRole('form', { name: 'Wachtwoord wijzigen' });
    await form.getByLabel('Huidig wachtwoord').fill(ORIGINAL);
    await form.getByLabel('Nieuw wachtwoord', { exact: true }).fill(TEMP);
    await form.getByLabel('Herhaal nieuw wachtwoord').fill(TEMP);

    const responsePromise = page.waitForResponse((r) => r.url().includes('/api/auth/change-password'));
    await form.getByRole('button', { name: /opslaan/i }).click();
    const response = await responsePromise;
    expect(response.status(), `body: ${await response.text().catch(() => '?')}`).toBe(200);

    await expect(form.getByText(/wachtwoord gewijzigd/i)).toBeVisible({ timeout: 10_000 });
  });
});
