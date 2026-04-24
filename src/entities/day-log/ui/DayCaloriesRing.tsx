import { ProgressRing } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export type DayCaloriesRingProps = {
  consumed: number;
  goal: number;
  size?: number;
  stroke?: number;
  className?: string;
};

export function DayCaloriesRing({
  consumed,
  goal,
  size = 180,
  stroke = 14,
  className,
}: DayCaloriesRingProps) {
  const percent = goal > 0 ? (consumed / goal) * 100 : 0;
  const remaining = Math.max(0, goal - consumed);
  const over = consumed > goal;

  return (
    <ProgressRing
      value={Math.min(100, percent)}
      size={size}
      stroke={stroke}
      color={over ? 'var(--color-danger)' : 'var(--color-primary-500)'}
      className={className}
      ariaLabel={`${Math.round(consumed)} van ${goal} kcal`}
      label={
        <div className={cn('flex flex-col items-center text-center')}>
          <span className="text-3xl font-semibold leading-tight">{Math.round(consumed)}</span>
          <span className="text-xs text-ink-muted">van {goal} kcal</span>
          <span className={cn('mt-1 text-xs font-medium', over ? 'text-danger' : 'text-ink-muted')}>
            {over ? `+${Math.round(consumed - goal)} over` : `${Math.round(remaining)} resterend`}
          </span>
        </div>
      }
    />
  );
}
