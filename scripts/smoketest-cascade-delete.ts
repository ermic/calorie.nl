// Verifieert dat ON DELETE CASCADE op meals/day_logs/meal_items werkt
// bij een user-delete. Gebruik: pnpm exec payload run scripts/smoketest-cascade-delete.ts

import { getPayload } from 'payload';
import config from '../src/payload.config';
import { sql } from '@payloadcms/db-postgres';

const payload = await getPayload({ config });

const email = `smoketest-cascade-${Date.now()}@test.local`;
const user = await payload.create({
  collection: 'users',
  overrideAccess: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { email, password: 'cascadetest', name: 'Cascade Test' } as any,
});
console.log(`✓ user gemaakt: ${user.email} (id=${user.id})`);

const dayLog = await payload.create({
  collection: 'dayLogs',
  overrideAccess: true,
  data: {
    user: user.id,
    date: new Date().toISOString().split('T')[0],
  },
});
console.log(`✓ dayLog gemaakt (id=${dayLog.id})`);

const meal = await payload.create({
  collection: 'meals',
  overrideAccess: true,
  data: {
    user: user.id,
    dayLog: dayLog.id,
    mealType: 'BREAKFAST',
    eatenAt: new Date().toISOString(),
  },
});
console.log(`✓ meal gemaakt (id=${meal.id})`);

const mealItem = await payload.create({
  collection: 'mealItems',
  overrideAccess: true,
  data: {
    meal: meal.id,
    name: 'Test item',
    quantity: 100,
    unit: 'g',
    calories: 200,
    protein: 0,
    carbs: 0,
    fat: 0,
  },
});
console.log(`✓ mealItem gemaakt (id=${mealItem.id})`);

console.log(`\nNu user verwijderen — verwachten dat dayLog/meal/mealItem cascade'n…`);

// Cascade in app-laag (zie account/delete/route.ts).
const userIdNum = typeof user.id === 'number' ? user.id : Number(user.id);
await payload.db.drizzle.execute(sql`
  DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ${userIdNum})
`);
await payload.db.drizzle.execute(sql`DELETE FROM meals WHERE user_id = ${userIdNum}`);
await payload.db.drizzle.execute(sql`DELETE FROM day_logs WHERE user_id = ${userIdNum}`);
await payload.db.drizzle.execute(sql`DELETE FROM users WHERE id = ${userIdNum}`);
console.log(`✓ user verwijderd`);

const dayLogCheck = await payload.db.drizzle.execute(
  sql`SELECT count(*)::int AS c FROM day_logs WHERE id = ${dayLog.id}`,
);
const mealCheck = await payload.db.drizzle.execute(
  sql`SELECT count(*)::int AS c FROM meals WHERE id = ${meal.id}`,
);
const mealItemCheck = await payload.db.drizzle.execute(
  sql`SELECT count(*)::int AS c FROM meal_items WHERE id = ${mealItem.id}`,
);

const counts = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dayLog: Number((dayLogCheck as any).rows[0]?.c ?? 0),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meal: Number((mealCheck as any).rows[0]?.c ?? 0),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mealItem: Number((mealItemCheck as any).rows[0]?.c ?? 0),
};
console.log(`\nResterende rijen:`, counts);

if (counts.dayLog === 0 && counts.meal === 0 && counts.mealItem === 0) {
  console.log('✅ Cascade werkt — alle eigen data van user is meegegaan.');
  process.exit(0);
}
console.error('❌ Cascade WERKT NIET — orphan rijen achtergebleven.');
process.exit(1);
