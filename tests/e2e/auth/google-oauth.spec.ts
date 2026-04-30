import { expect, test } from '@playwright/test';

// Server-side OAuth-routes hangen af van een echte Google + mock-server.
// Voor de happy path (full code-exchange) wachten we op een test-helper
// die oauth2-mock-server op een dedicated port draait + de env-vars
// override't. In deze PR dekken we alleen de error-paths via HTTP.

test.describe('google-oauth', () => {
  test('GET /api/auth/google/start zonder env-config → oauth_not_configured', async ({
    request,
  }) => {
    // GOOGLE_CLIENT_ID is leeg in .env → de start-route bouwt geen URL.
    const res = await request.get('/api/auth/google/start', { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toMatch(/error=oauth_not_configured/);
  });

  test('GET /api/auth/google/start zonder code/state in callback → oauth_state_mismatch', async ({
    request,
  }) => {
    const res = await request.get('/api/auth/google/callback', { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toMatch(/error=oauth_state_mismatch/);
  });

  test('GET /api/auth/google/callback met onbekende state → state_mismatch of not_configured', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/auth/google/callback?code=fake&state=onbekend-state-12345',
      { maxRedirects: 0 },
    );
    expect(res.status()).toBe(303);
    // Met env leeg krijgen we eerst not_configured; met config gevuld
    // krijgen we state_mismatch (rij niet gevonden).
    expect(res.headers().location).toMatch(/error=(oauth_not_configured|oauth_state_mismatch)/);
  });
});
