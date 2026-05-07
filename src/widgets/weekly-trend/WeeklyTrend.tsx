import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card } from '@/shared/ui';
import { getPayload } from '@/shared/lib/payload';
import {
  addDaysInTimezone,
  dayKeyInTimezone,
  DEFAULT_TIMEZONE,
  endOfDayInTimezone,
  startOfDayInTimezone,
} from '@/shared/lib/timezone';
import { calculateTDEE, type User } from '@/entities/user/model/calculations';
import { sumMealItems } from '@/entities/meal';
import { WeeklyTrendChart, type WeeklyPoint } from './WeeklyTrendChart';

const DEFAULT_GOAL = 2000;
const DAYS = 7;
const MEAL_FETCH_LIMIT = 500;
const ITEM_FETCH_LIMIT = 5000;

export async function WeeklyTrend({ user }: { user: User }) {
  const payload = await getPayload();
  const tz = user.timezone || DEFAULT_TIMEZONE;
  const now = new Date();
  const todayStart = startOfDayInTimezone(now, tz);
  const rangeStart = startOfDayInTimezone(addDaysInTimezone(now, -(DAYS - 1), tz), tz);
  const rangeEnd = endOfDayInTimezone(now, tz);

  const { docs: meals } = await payload.find({
    collection: 'meals',
    where: {
      and: [
        { user: { equals: user.id } },
        { eatenAt: { greater_than_equal: rangeStart.toISOString() } },
        { eatenAt: { less_than_equal: rangeEnd.toISOString() } },
      ],
    },
    limit: MEAL_FETCH_LIMIT,
    depth: 0,
    overrideAccess: false,
    user,
  });
  if (meals.length === MEAL_FETCH_LIMIT) {
    console.warn('[WeeklyTrend] meal-fetch limit bereikt — trend kan onderschat zijn');
  }

  const caloriesByDay = new Map<string, number>();
  for (let i = 0; i < DAYS; i++) {
    const d = addDaysInTimezone(todayStart, -(DAYS - 1 - i), tz);
    caloriesByDay.set(dayKeyInTimezone(d, tz), 0);
  }

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
      console.warn('[WeeklyTrend] item-fetch limit bereikt — trend kan onderschat zijn');
    }

    const itemsByMeal = new Map<number, typeof items>();
    for (const item of items) {
      const mealId = typeof item.meal === 'object' ? item.meal.id : item.meal;
      const list = itemsByMeal.get(mealId) ?? [];
      list.push(item);
      itemsByMeal.set(mealId, list);
    }

    for (const meal of meals) {
      if (!meal.eatenAt) continue;
      const dayKey = dayKeyInTimezone(new Date(meal.eatenAt), tz);
      if (!caloriesByDay.has(dayKey)) continue;
      const totals = sumMealItems(itemsByMeal.get(meal.id) ?? []);
      caloriesByDay.set(dayKey, (caloriesByDay.get(dayKey) ?? 0) + totals.calories);
    }
  }

  const data: WeeklyPoint[] = Array.from(caloriesByDay.entries()).map(([dayKey, calories]) => ({
    // dayKey is YYYY-MM-DD (zone-onafhankelijk); format als lokale UTC-Date
    // levert hetzelfde dagcijfer op ongeacht runtime-tz.
    label: format(new Date(`${dayKey}T12:00:00Z`), 'EEEEEE', { locale: nl }),
    calories: Math.round(calories),
  }));

  const goal = user.dailyCalorieGoal ?? calculateTDEE(user) ?? DEFAULT_GOAL;

  return (
    <Card padded className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">Laatste 7 dagen</h3>
        <span className="text-xs text-ink-muted">doel {goal} kcal</span>
      </div>
      <WeeklyTrendChart data={data} goal={goal} />
    </Card>
  );
}
