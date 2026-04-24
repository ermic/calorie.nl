'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/shared/lib/cn';
import type { MealTotals } from '../model/types';

export type MealDonutProps = {
  totals: MealTotals;
  size?: number;
  className?: string;
};

// Kcal-bijdrage per gram macro; Atwater-factoren. Gebruikt om de donut
// proportioneel de macro-verdeling te laten zien in kcal.
const SLICES: Array<{ key: 'protein' | 'carbs' | 'fat'; label: string; color: string; kcalPerGram: number }> = [
  { key: 'protein', label: 'Eiwit', color: 'var(--color-accent-blue)', kcalPerGram: 4 },
  { key: 'carbs', label: 'Koolh.', color: 'var(--color-accent-yellow)', kcalPerGram: 4 },
  { key: 'fat', label: 'Vet', color: 'var(--color-primary-500)', kcalPerGram: 9 },
];

export function MealDonut({ totals, size = 180, className }: MealDonutProps) {
  const data = SLICES.map((s) => ({
    name: s.label,
    value: Math.max(0, totals[s.key] * s.kcalPerGram),
    color: s.color,
  }));
  const hasData = data.some((d) => d.value > 0);
  const rendered = hasData
    ? data
    : [{ name: 'Leeg', value: 1, color: 'var(--color-primary-100)' }];
  // Center toont de som van de slices (Atwater uit macros) zodat het
  // getal altijd bij de slice-proporties past. Dat kan afwijken van de
  // ingevoerde totals.calories — die wordt bewust niet getoond om geen
  // visuele discrepantie te veroorzaken.
  const centerKcal = Math.round(data.reduce((acc, d) => acc + d.value, 0));

  return (
    <figure
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Macroverdeling: ${data.map((d) => `${d.name} ${Math.round(d.value)} kcal`).join(', ')}`}
    >
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={rendered}
            dataKey="value"
            innerRadius={size / 2 - 22}
            outerRadius={size / 2 - 4}
            stroke="var(--color-surface)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {rendered.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-2xl font-semibold leading-tight">{centerKcal}</span>
        <span className="text-xs text-ink-muted">kcal uit macro&rsquo;s</span>
      </figcaption>
    </figure>
  );
}
