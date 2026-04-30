import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../setup/users';
import { authHeaders, login, loginApi } from '../setup/login-helper';

const TEMP_EMAIL = 'e2e-d-temp@test.local';

test.describe('change-email', () => {
  test('API: juist wachtwoord + nieuw adres → 200', async ({ request }) => {
    const token = await loginApi(request, 'd');
    const res = await request.post('/api/auth/change-email', {
      headers: authHeaders(token),
      data: { newEmail: TEMP_EMAIL, currentPassword: TEST_USERS.d.password },
    });
    expect(res.status(), `body: ${await res.text().catch(() => '?')}`).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });

    // Account-e-mail mag pas wijzigen ná confirm-klik; nu nog ORIGINAL.
    const me = await request.get('/api/users/me', { headers: authHeaders(token) });
    const meBody = await me.json();
    expect(meBody.user?.email).toBe(TEST_USERS.d.email);
  });

  test('API: fout huidig wachtwoord → 400', async ({ request }) => {
    const token = await loginApi(request, 'd');
    const res = await request.post('/api/auth/change-email', {
      headers: authHeaders(token),
      data: { newEmail: TEMP_EMAIL, currentPassword: 'fout' },
    });
    expect(res.status()).toBe(400);
  });

  test('API: bestaande email van andere user → 400', async ({ request }) => {
    const token = await loginApi(request, 'd');
    const res = await request.post('/api/auth/change-email', {
      headers: authHeaders(token),
      data: { newEmail: TEST_USERS.a.email, currentPassword: TEST_USERS.d.password },
    });
    expect(res.status()).toBe(400);
  });

  test('API: zelfde adres als huidig → 400', async ({ request }) => {
    const token = await loginApi(request, 'd');
    const res = await request.post('/api/auth/change-email', {
      headers: authHeaders(token),
      data: { newEmail: TEST_USERS.d.email, currentPassword: TEST_USERS.d.password },
    });
    expect(res.status()).toBe(400);
  });

  test('API: niet ingelogd → 401', async ({ request }) => {
    const res = await request.post('/api/auth/change-email', {
      data: { newEmail: TEMP_EMAIL, currentPassword: TEST_USERS.d.password },
    });
    expect(res.status()).toBe(401);
  });

  test('UI: form-submit → success-melding', async ({ page }) => {
    await login(page, 'd');
    await page.goto('/profile');

    const form = page.getByRole('form', { name: 'E-mailadres wijzigen' });
    await form.getByLabel('Nieuw e-mailadres').fill(TEMP_EMAIL);
    await form.getByLabel('Huidig wachtwoord').fill(TEST_USERS.d.password);

    const responsePromise = page.waitForResponse((r) => r.url().includes('/api/auth/change-email'));
    await form.getByRole('button', { name: /wijziging aanvragen/i }).click();
    const response = await responsePromise;
    expect(response.status(), `body: ${await response.text().catch(() => '?')}`).toBe(200);

    await expect(form.getByText(/bevestigingsmail verstuurd/i)).toBeVisible({ timeout: 10_000 });
  });
});
