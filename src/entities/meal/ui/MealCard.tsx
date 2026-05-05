import Link from 'next/link';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatKcal, formatTime } from '@/shared/lib/format';
import type { Meal } from '../model/types';
import { safeImageSrc } from '../lib/photo-url';
import { MealMacroRow, type MealMacros } from './MealMacroRow';
import { MealTypeBadge } from './MealTypeBadge';

export type MealCardProps = {
  meal: Pick<Meal, 'id' | 'mealType' | 'eatenAt' | 'photoUrl' | 'title'>;
  totals: MealMacros & { calories: number };
  href?: string;
  className?: string;
  // User-tz; nodig voor server-rendered MealCards (RecentMeals widget).
  // Client-rendered (MealsList) mag 'm leeg laten — browser-tz volstaat.
  timezone?: string;
};

export function MealCard({ meal, totals, href, className, timezone }: MealCardProps) {
  const photoSrc = safeImageSrc(meal.photoUrl);
  const content = (
    <Card
      padded
      interactive={Boolean(href)}
      className={cn('flex items-center gap-3 min-w-[260px] max-w-[33%]', className)}
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-14 w-14 rounded-[var(--radius-card)] object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="h-14 w-14 rounded-[var(--radius-card)] bg-primary-100 flex-shrink-0"
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MealTypeBadge type={meal.mealType} />
          {meal.eatenAt && (
            <span className="text-xs text-ink-muted">{formatTime(meal.eatenAt, timezone)}</span>
          )}
        </div>
        {meal.title && (
          <p className="mt-1 text-sm font-medium text-ink line-clamp-2" title={meal.title}>
            {meal.title}
          </p>
        )}
        <div className="mt-1 text-sm font-semibold text-ink">{formatKcal(totals.calories)}</div>
        <MealMacroRow className="mt-1" macros={totals} compact />
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
