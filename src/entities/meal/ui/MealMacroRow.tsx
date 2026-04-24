import { cn } from '@/shared/lib/cn';
import { formatMacro } from '@/shared/lib/format';

export type MealMacros = {
  protein: number;
  carbs: number;
  fat: number;
};

type Item = { label: string; value: number; color: string };

export type MealMacroRowProps = {
  macros: MealMacros;
  className?: string;
  compact?: boolean;
};

export function MealMacroRow({ macros, className, compact = false }: MealMacroRowProps) {
  const items: Item[] = [
    { label: 'Eiwit', value: macros.protein, color: 'var(--color-accent-blue)' },
    { label: 'Koolh.', value: macros.carbs, color: 'var(--color-accent-yellow)' },
    { label: 'Vet', value: macros.fat, color: 'var(--color-primary-500)' },
  ];

  return (
    <ul className={cn('flex items-center gap-3 text-xs text-ink-muted', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden />
          {!compact && <span>{item.label}</span>}
          <span className="text-ink font-medium">{formatMacro(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
