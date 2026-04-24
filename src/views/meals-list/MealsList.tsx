'use client';

import { useState } from 'react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button, Card } from '@/shared/ui';
import { apiFetch, ApiError } from '@/shared/lib/api';
import { formatKcal } from '@/shared/lib/format';
import { MealCard } from '@/entities/meal';
import type { MealListItem, MealsPage } from './fetch-meals';

const PAGE_SIZE = 30;

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Vandaag';
  if (isYesterday(date)) return 'Gisteren';
  return format(date, 'EEEE d MMMM', { locale: nl });
}

type DayGroup = { key: string; date: Date; meals: MealListItem[]; totalKcal: number };

function groupByDay(meals: MealListItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const meal of meals) {
    const eatenAt = meal.eatenAt ? new Date(meal.eatenAt) : new Date(meal.createdAt);
    const dayStart = startOfDay(eatenAt);
    const key = format(dayStart, 'yyyy-MM-dd');
    const bucket = map.get(key) ?? { key, date: dayStart, meals: [], totalKcal: 0 };
    bucket.meals.push(meal);
    bucket.totalKcal += meal.totals.calories;
    map.set(key, bucket);
  }
  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export type MealsListProps = {
  initialPage: MealsPage;
};

export function MealsList({ initialPage }: MealsListProps) {
  const [meals, setMeals] = useState<MealListItem[]>(initialPage.meals);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [nextOffset, setNextOffset] = useState(initialPage.nextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await apiFetch<MealsPage>('/api/meals', {
        params: { offset: nextOffset, limit: PAGE_SIZE },
      });
      setMeals((prev) => [...prev, ...page.meals]);
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Laden mislukt.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const groups = groupByDay(meals);

  return (
    <>
      {groups.map((group) => (
        <section key={group.key} aria-label={dayLabel(group.date)} className="space-y-2">
          <header className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
              {dayLabel(group.date)}
            </h2>
            <span className="text-xs text-ink-muted">{formatKcal(group.totalKcal)}</span>
          </header>
          <ul role="list" className="space-y-2">
            {group.meals.map((meal) => (
              <li key={meal.id} className="list-none">
                <MealCard meal={meal} href={`/meals/${meal.id}`} totals={meal.totals} className="min-w-0" />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {error && (
        <Card padded className="text-sm text-danger" role="alert">
          {error}
        </Card>
      )}

      {hasMore && (
        <div className="pt-2 flex justify-center">
          <Button variant="secondary" size="lg" onClick={loadMore} loading={loading} disabled={loading}>
            {loading ? 'Laden…' : 'Laad meer'}
          </Button>
        </div>
      )}
    </>
  );
}
