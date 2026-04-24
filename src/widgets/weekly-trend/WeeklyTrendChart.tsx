'use client';

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type WeeklyPoint = {
  label: string;
  calories: number;
};

export type WeeklyTrendChartProps = {
  data: WeeklyPoint[];
  goal: number;
};

export function WeeklyTrendChart({ data, goal }: WeeklyTrendChartProps) {
  const srSummary = data.map((d) => `${d.label}: ${d.calories} kcal`).join(', ');
  return (
    <figure
      className="h-48 -mx-2"
      aria-label={`Calorieën laatste 7 dagen. Doel ${goal} kcal. ${srSummary}`}
      role="group"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink)" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-primary-500)', strokeOpacity: 0.3 }}
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid rgb(0 0 0 / 0.08)',
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value) => [`${Math.round(Number(value))} kcal`, 'Calorieën']}
          />
          {goal > 0 && (
            <ReferenceLine
              y={goal}
              stroke="var(--color-accent-green)"
              strokeDasharray="4 4"
              label={{ value: 'Doel', position: 'insideTopRight', fill: 'var(--color-ink-muted)', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="calories"
            stroke="var(--color-primary-500)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-primary-500)' }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
