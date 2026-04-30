import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../setup/users';
import { authHeaders, loginApi } from '../setup/login-helper';

// Basis-API-coverage. Full register → login flow vereist Chrome DevTools
// Protocol's WebAuthn-virtual-authenticator (open follow-up — vergelijkbaar
// met OAuth happy-path die op oauth2-mock-server wacht).

test.describe('passkey routes', () => {
  test('POST register/options zonder login → 401', async ({ request }) => {
    const res = await request.post('/api/auth/passkey/register/options', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('POST register/options met login → 200 + valid challenge', async ({ request }) => {
    const token = await loginApi(request, 'b');
    const res = await request.post('/api/auth/passkey/register/options', {
      headers: authHeaders(token),
      data: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.challenge).toBe('string');
    expect(body.rp).toBeTruthy();
    expect(body.user).toBeTruthy();
  });

  test('POST register/verify zonder body → 400', async ({ request }) => {
    const token = await loginApi(request, 'b');
    const res = await request.post('/api/auth/passkey/register/verify', {
      headers: authHeaders(token),
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('POST login/options zonder email → 200 + usernameless challenge', async ({ request }) => {
    const res = await request.post('/api/auth/passkey/login/options', {
      data: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.challenge).toBe('string');
  });

  test('POST login/verify met onbekende credential → 400', async ({ request }) => {
    // Eerst een geldige challenge starten zodat verify niet meteen op
    // "geen actieve sessie" valt.
    await request.post('/api/auth/passkey/login/options', { data: {} });

    const res = await request.post('/api/auth/passkey/login/verify', {
      data: {
        response: {
          id: 'onbekende-credential-id',
          rawId: 'onbekende-credential-id',
          type: 'public-key',
          response: {
            authenticatorData: '',
            clientDataJSON: '',
            signature: '',
            userHandle: '',
          },
          clientExtensionResults: {},
        },
      },
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE credentials/:id zonder login → 401', async ({ request }) => {
    const res = await request.delete('/api/auth/passkey/credentials/abc');
    expect(res.status()).toBe(401);
  });

  test('DELETE credentials/:id met login + onbekend id → 404', async ({ request }) => {
    const token = await loginApi(request, 'b');
    const res = await request.delete('/api/auth/passkey/credentials/onbekend', {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(404);
  });
});
