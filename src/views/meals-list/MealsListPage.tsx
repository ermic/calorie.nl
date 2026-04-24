import Link from 'next/link';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { AppHeader } from '@/widgets/app-shell';
import { Card, EmptyState } from '@/shared/ui';
import { getPayload } from '@/shared/lib/payload';
import { requireUser } from '@/shared/lib/auth-guard';
import { MealCard, sumMealItems, type Meal, type MealItem } from '@/entities/meal';
import { formatKcal } from '@/shared/lib/format';

const MEAL_FETCH_LIMIT = 100;
const ITEM_FETCH_LIMIT = 2000;

// v1 NL-only: 'vandaag/gisteren' volgt de server-tijdzone. Zelfde
// aanname als dashboard-widgets.
function dayLabel(date: Date): string {
  if (isToday(date)) return 'Vandaag';
  if (isYesterday(date)) return 'Gisteren';
  return format(date, 'EEEE d MMMM', { locale: nl });
}

type MealWithTotals = Meal & {
  _totals: ReturnType<typeof sumMealItems>;
};

export async function MealsListPage() {
  const user = await requireUser();
  const payload = await getPayload();

  const { docs: meals } = await payload.find({
    collection: 'meals',
    where: { user: { equals: user.id } },
    sort: '-eatenAt',
    limit: MEAL_FETCH_LIMIT,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  });

  let itemsByMeal = new Map<number, MealItem[]>();
  if (meals.length > 0) {
    const { docs: items } = await payload.find({
      collection: 'mealItems',
      where: { meal: { in: meals.map((m) => m.id) } },
      limit: ITEM_FETCH_LIMIT,
      depth: 0,
      pagination: false,
      overrideAccess: false,
      user,
    });
    if (items.length === ITEM_FETCH_LIMIT) {
      console.warn('[MealsListPage] item-fetch limit bereikt — per-meal totalen kunnen onderschat zijn');
    }
    itemsByMeal = items.reduce((map, item) => {
      const mealId = typeof item.meal === 'object' ? item.meal.id : item.meal;
      const list = map.get(mealId) ?? [];
      list.push(item);
      map.set(mealId, list);
      return map;
    }, new Map<number, MealItem[]>());
  }

  const groups = new Map<string, { date: Date; meals: MealWithTotals[]; totalKcal: number }>();
  for (const meal of meals) {
    const eatenAt = meal.eatenAt ? new Date(meal.eatenAt) : new Date(meal.createdAt);
    const dayStart = startOfDay(eatenAt);
    const key = format(dayStart, 'yyyy-MM-dd');
    const totals = sumMealItems(itemsByMeal.get(meal.id) ?? []);
    const bucket = groups.get(key) ?? { date: dayStart, meals: [], totalKcal: 0 };
    bucket.meals.push({ ...meal, _totals: totals });
    bucket.totalKcal += totals.calories;
    groups.set(key, bucket);
  }

  const sorted = Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <AppHeader title="Maaltijden" />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl space-y-6">
        {sorted.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nog geen maaltijden"
            description="Voeg je eerste maaltijd toe — handmatig of via foto-analyse."
            action={
              <Link
                href="/add-meal"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-600 text-white px-5 text-sm font-medium hover:bg-primary-700"
              >
                <Plus size={18} aria-hidden />
                Maaltijd toevoegen
              </Link>
            }
          />
        ) : (
          sorted.map((group) => (
            <section key={group.date.toISOString()} aria-label={dayLabel(group.date)} className="space-y-2">
              <header className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
                  {dayLabel(group.date)}
                </h2>
                <span className="text-xs text-ink-muted">{formatKcal(group.totalKcal)}</span>
              </header>
              <ul role="list" className="space-y-2">
                {group.meals.map((meal) => (
                  <li key={meal.id} className="list-none">
                    <MealCard
                      meal={meal}
                      href={`/meals/${meal.id}`}
                      totals={{
                        calories: Math.round(meal._totals.calories),
                        protein: Math.round(meal._totals.protein),
                        carbs: Math.round(meal._totals.carbs),
                        fat: Math.round(meal._totals.fat),
                      }}
                      className="min-w-0"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {meals.length === MEAL_FETCH_LIMIT && (
          <Card padded className="text-xs text-ink-muted text-center">
            Je oudste maaltijden zijn niet getoond (limiet {MEAL_FETCH_LIMIT}). Paginering volgt.
          </Card>
        )}
      </main>
    </>
  );
}
