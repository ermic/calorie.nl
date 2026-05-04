'use client';

import { useEffect, useState } from 'react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Button, Card } from '@/shared/ui';
import { apiFetch, getApiErrorMessage } from '@/shared/lib/api';
import { formatKcal } from '@/shared/lib/format';
import { MealCard } from '@/entities/meal';
import type { MealListItem, MealsPage } from './fetch-meals';

type ThumbsResponse = { thumbs: Record<string, string | null> };

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
  const [thumbs, setThumbs] = useState<Map<number, string | null>>(new Map());

  // Laad thumbs voor zojuist toegevoegde meal-ids in één batch. Dedup
  // op de thumbs-state zelf — een geannuleerde fetch (snelle load-more)
  // laat de ids niet permanent in een 'fetched' ref achter, dus het
  // volgende effect-run pakt ze alsnog op. Faalt de fetch (auth-loss,
  // netwerk), dan blijft de placeholder staan: thumbs zijn cosmetisch
  // en mogen geen error-toast triggeren.
  useEffect(() => {
    const idsToFetch = meals.map((m) => m.id).filter((id) => !thumbs.has(id));
    if (idsToFetch.length === 0) return;

    let cancelled = false;
    apiFetch<ThumbsResponse>('/api/meals/thumbs', { params: { ids: idsToFetch.join(',') } })
      .then((res) => {
        if (cancelled) return;
        setThumbs((prev) => {
          const next = new Map(prev);
          for (const [id, thumb] of Object.entries(res.thumbs)) {
            next.set(Number(id), thumb);
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [meals, thumbs]);

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
      setError(getApiErrorMessage(err, 'Laden mislukt.'));
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
                <MealCard
                  meal={{ ...meal, photoUrl: thumbs.get(meal.id) ?? null }}
                  href={`/meals/${meal.id}`}
                  totals={meal.totals}
                  className="min-w-0"
                />
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
