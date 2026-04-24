import { expect, test } from '@playwright/test';
import { authHeaders, loginApi } from '../setup/login-helper';

// Cross-user access-control regressies. We gebruiken de Authorization-
// header (JWT) i.p.v. cookies omdat custom REST-routes de cookie-auth
// nu niet honoreren — zie FOLLOW_UPS-tickets. Het pad dekt het scenario
// nog steeds: payload.auth({ headers }) accepteert beide strategieën.

test.describe('cross-user isolation', () => {
  let mealAId: number;
  let mealAName: string;

  test('user A creëert een privé-maaltijd via API', async ({ request }) => {
    const tokenA = await loginApi(request, 'a');
    mealAName = `A-only ${Date.now()}`;

    const save = await request.post('/api/meals/save', {
      headers: authHeaders(tokenA),
      data: {
        mealType: 'LUNCH',
        items: [
          { name: mealAName, quantity: 100, unit: 'g', calories: 200, protein: 5, carbs: 30, fat: 5 },
        ],
      },
    });
    expect(save.ok()).toBe(true);
    const body = await save.json();
    expect(typeof body.mealId).toBe('number');
    mealAId = body.mealId;

    const list = await request.get('/api/meals?limit=5', { headers: authHeaders(tokenA) });
    const listBody = await list.json();
    const ids = listBody.meals.map((m: { id: number }) => m.id);
    expect(ids).toContain(mealAId);
  });

  test('user B ziet andermans meal niet in /api/meals', async ({ request }) => {
    const tokenB = await loginApi(request, 'b');
    const res = await request.get('/api/meals?limit=50', { headers: authHeaders(tokenB) });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const ids = body.meals.map((m: { id: number }) => m.id);
    expect(ids).not.toContain(mealAId);
  });

  test('user B kan andermans meal niet DELETE-en', async ({ request }) => {
    const tokenB = await loginApi(request, 'b');
    const res = await request.delete(`/api/meals/${mealAId}`, { headers: authHeaders(tokenB) });
    // Custom DELETE-route mapt Forbidden/NotFound naar 404.
    expect([403, 404]).toContain(res.status());
  });

  test('user B ziet andermans USER-food niet in /api/foods/search', async ({ request }) => {
    const tokenB = await loginApi(request, 'b');
    const res = await request.get(`/api/foods/search?q=${encodeURIComponent(mealAName)}`, {
      headers: authHeaders(tokenB),
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const names = (body.results as { name: string }[]).map((r) => r.name);
    expect(names).not.toContain(mealAName);
  });
});
