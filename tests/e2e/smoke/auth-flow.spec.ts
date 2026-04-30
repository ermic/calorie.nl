import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../setup/users';
import { login } from '../setup/login-helper';

// Basis smoke: login → dashboard → /meals navigatie. Verifieert dat de
// auth-flow van form-submit tot SSR-page-render werkt.

test('user A kan inloggen en op het dashboard landen', async ({ page }) => {
  await login(page, 'a');
  await expect(page.getByRole('heading', { name: /hallo/i })).toBeVisible();
});

test('inloggen met fout wachtwoord toont een foutmelding', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(TEST_USERS.a.email);
  await page.getByLabel('Wachtwoord').fill('niet-correct');
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
  await expect(page.getByText(/onjuist|incorrect|provided/i)).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/login$/);
});

test('niet-ingelogd: /meals redirect naar /login', async ({ page }) => {
  await page.goto('/meals');
  await expect(page).toHaveURL(/\/login/);
});

test('niet-bestaande route binnen (app)/ → custom 404', async ({ page }) => {
  await login(page, 'a');
  const response = await page.goto('/meals/9999999');
  expect(response?.status()).toBe(404);
  await expect(page.getByText(/Deze pagina bestaat niet/)).toBeVisible();
});
