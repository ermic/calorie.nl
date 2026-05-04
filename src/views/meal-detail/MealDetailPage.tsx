import { notFound } from 'next/navigation';
import { Forbidden, NotFound } from 'payload';
import { AppHeader } from '@/widgets/app-shell';
import { Card } from '@/shared/ui';
import { DeleteMealButton } from '@/features/delete-meal';
import { getPayload } from '@/shared/lib/payload';
import { requireUser } from '@/shared/lib/auth-guard';
import {
  MEAL_TYPE_LABELS,
  MealDonut,
  MealMacroRow,
  MealPhotoThumb,
  MealTypeBadge,
  sumMealItems,
} from '@/entities/meal';
import { formatDateLong, formatKcal, formatMacro, formatTime } from '@/shared/lib/format';
import { DEFAULT_TIMEZONE } from '@/shared/lib/timezone';

export async function MealDetailPage({ id }: { id: number }) {
  const user = await requireUser();
  const payload = await getPayload();
  const tz = user.timezone || DEFAULT_TIMEZONE;

  let meal;
  try {
    meal = await payload.findByID({
      collection: 'meals',
      id,
      depth: 0,
      overrideAccess: false,
      user,
    });
  } catch (err) {
    if (err instanceof NotFound || err instanceof Forbidden) {
      notFound();
    }
    throw err;
  }

  const { docs: items } = await payload.find({
    collection: 'mealItems',
    where: { meal: { equals: meal.id } },
    sort: 'createdAt',
    limit: 200,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  });

  const totals = sumMealItems(items);
  const eatenAt = meal.eatenAt ? new Date(meal.eatenAt) : new Date(meal.createdAt);

  return (
    <>
      <AppHeader title={MEAL_TYPE_LABELS[meal.mealType]} back />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl space-y-5">
        <Card padded className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <MealTypeBadge type={meal.mealType} />
            <span>·</span>
            <span>{formatDateLong(eatenAt, tz)}</span>
            <span>·</span>
            <span>{formatTime(eatenAt, tz)}</span>
            {meal.photoUrl && <MealPhotoThumb src={meal.photoUrl} className="ml-1" />}
          </div>
          <MealDonut
            totals={{
              calories: Math.round(totals.calories),
              protein: Math.round(totals.protein),
              carbs: Math.round(totals.carbs),
              fat: Math.round(totals.fat),
            }}
          />
          <MealMacroRow macros={totals} />
          {meal.aiAnalyzed && meal.aiConfidence != null && (
            <p className="text-xs text-ink-muted">
              AI-analyse — zekerheid {Math.round(meal.aiConfidence * 100)}%
            </p>
          )}
        </Card>

        <section aria-labelledby="items-heading" className="space-y-2">
          <h2 id="items-heading" className="text-sm font-semibold text-ink-muted uppercase tracking-wide px-1">
            Items ({items.length})
          </h2>
          {items.length === 0 ? (
            <Card padded className="text-sm text-ink-muted">
              Geen items gekoppeld aan deze maaltijd.
            </Card>
          ) : (
            <ul role="list" className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="list-none">
                  <Card padded className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-ink-muted">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div className="text-right text-xs text-ink-muted shrink-0">
                      <div className="text-sm font-semibold text-ink">{formatKcal(item.calories)}</div>
                      <div>
                        E {formatMacro(item.protein ?? 0)} · K {formatMacro(item.carbs ?? 0)} · V{' '}
                        {formatMacro(item.fat ?? 0)}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end pt-2">
          <DeleteMealButton mealId={meal.id} />
        </div>
      </main>
    </>
  );
}
