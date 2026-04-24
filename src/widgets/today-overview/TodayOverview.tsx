import { Card } from '@/shared/ui';
import { getPayload } from '@/shared/lib/payload';
import { calculateTDEE, type User } from '@/entities/user/model/calculations';
import { MealMacroRow, sumMealItems } from '@/entities/meal';
import { DayCaloriesRing, type DayTotals } from '@/entities/day-log';

const DEFAULT_GOAL = 2000;
const MEAL_FETCH_LIMIT = 100;
const ITEM_FETCH_LIMIT = 1000;

// v1 NL-only: "vandaag" volgt de server-tijdzone (Europe/Amsterdam). Voor
// internationale uitrol → timezone op User en date-fns-tz.
function startOfDay(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d = new Date()) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export async function TodayOverview({ user }: { user: User }) {
  const payload = await getPayload();

  const { docs: meals } = await payload.find({
    collection: 'meals',
    where: {
      and: [
        { user: { equals: user.id } },
        { eatenAt: { greater_than_equal: startOfDay().toISOString() } },
        { eatenAt: { less_than_equal: endOfDay().toISOString() } },
      ],
    },
    limit: MEAL_FETCH_LIMIT,
    depth: 0,
    overrideAccess: false,
    user,
  });
  if (meals.length === MEAL_FETCH_LIMIT) {
    console.warn('[TodayOverview] meal-fetch limit bereikt — totalen kunnen onderschat zijn');
  }

  let totals: DayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (meals.length > 0) {
    const mealIds = meals.map((m) => m.id);
    const { docs: items } = await payload.find({
      collection: 'mealItems',
      where: { meal: { in: mealIds } },
      limit: ITEM_FETCH_LIMIT,
      depth: 0,
      overrideAccess: false,
      user,
    });
    if (items.length === ITEM_FETCH_LIMIT) {
      console.warn('[TodayOverview] item-fetch limit bereikt — totalen kunnen onderschat zijn');
    }
    const sum = sumMealItems(items);
    totals = {
      calories: Math.round(sum.calories),
      protein: Math.round(sum.protein),
      carbs: Math.round(sum.carbs),
      fat: Math.round(sum.fat),
    };
  }

  const goal = user.dailyCalorieGoal ?? calculateTDEE(user) ?? DEFAULT_GOAL;

  return (
    <Card padded className="flex flex-col items-center gap-4 py-6">
      <DayCaloriesRing consumed={totals.calories} goal={goal} />
      <MealMacroRow macros={totals} />
      <p className="text-xs text-ink-muted">
        {meals.length === 0
          ? 'Nog geen maaltijden vandaag'
          : `${meals.length} maaltijd${meals.length === 1 ? '' : 'en'} vandaag`}
      </p>
    </Card>
  );
}
