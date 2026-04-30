import { expect, test } from '@playwright/test';
import { authHeaders, loginApi } from '../setup/login-helper';

// Tests dekken alleen de DELETE-route happy/edge paths via directe
// API-calls. Full link → unlink met daadwerkelijk gevulde providers
// (incl last-method-guard) vereist een mock-Google-server om de
// providers in users.providers te krijgen — open follow-up uit fase 2.

test.describe('unlink-providers', () => {
  test('DELETE niet-bestaande provider → 404', async ({ request }) => {
    const token = await loginApi(request, 'b');
    const res = await request.delete('/api/auth/providers/google', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(404);
  });

  test('DELETE onbekende provider-naam → 400', async ({ request }) => {
    const token = await loginApi(request, 'b');
    const res = await request.delete('/api/auth/providers/twitter', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE zonder login → 401', async ({ request }) => {
    const res = await request.delete('/api/auth/providers/google');
    expect(res.status()).toBe(401);
  });
});
