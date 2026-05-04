import Link from 'next/link';
import { EmptyState } from '@/shared/ui';
import { UtensilsCrossed } from 'lucide-react';
import { getPayload } from '@/shared/lib/payload';
import { DEFAULT_TIMEZONE } from '@/shared/lib/timezone';
import { MealCard, sumMealItems } from '@/entities/meal';
import type { User } from '@/entities/user/model/calculations';

export async function RecentMeals({ user, limit = 8 }: { user: User; limit?: number }) {
  const payload = await getPayload();
  const tz = user.timezone || DEFAULT_TIMEZONE;

  const { docs: meals } = await payload.find({
    collection: 'meals',
    where: { user: { equals: user.id } },
    sort: '-eatenAt',
    limit,
    depth: 0,
    overrideAccess: false,
    user,
  });

  if (meals.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Nog geen maaltijden"
        description="Voeg je eerste maaltijd toe met de +-knop onderin."
      />
    );
  }

  const mealIds = meals.map((m) => m.id);
  const { docs: items } = await payload.find({
    collection: 'mealItems',
    where: { meal: { in: mealIds } },
    limit: 1000,
    depth: 0,
    overrideAccess: false,
    user,
  });

  const itemsByMeal = new Map<number, typeof items>();
  for (const item of items) {
    const mealId = typeof item.meal === 'object' ? item.meal.id : item.meal;
    const list = itemsByMeal.get(mealId) ?? [];
    list.push(item);
    itemsByMeal.set(mealId, list);
  }

  return (
    <section aria-labelledby="recent-meals-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 id="recent-meals-heading" className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
          Recente maaltijden
        </h3>
        <Link href="/meals" className="text-xs text-primary-700 font-medium hover:underline">
          Alle maaltijden
        </Link>
      </div>
      <ul
        role="list"
        aria-label="Recente maaltijden"
        className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
      >
        {meals.map((meal) => {
          const mealItems = itemsByMeal.get(meal.id) ?? [];
          const totals = sumMealItems(mealItems);
          return (
            <li key={meal.id} className="snap-start list-none">
              <MealCard
                meal={meal}
                href={`/meals/${meal.id}`}
                timezone={tz}
                totals={{
                  calories: Math.round(totals.calories),
                  protein: Math.round(totals.protein),
                  carbs: Math.round(totals.carbs),
                  fat: Math.round(totals.fat),
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
