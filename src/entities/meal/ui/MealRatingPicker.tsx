'use client';

import { Angry, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export type MealRating = 1 | 2 | 3 | 4 | 5;

export type MealRatingPickerProps = {
  value: MealRating | null;
  onChange: (rating: MealRating) => void;
  className?: string;
};

type RatingOption = {
  value: MealRating;
  label: string;
  icon: LucideIcon;
  color: string;
};

// Vaste hex-kleuren ipv tailwind-tokens omdat we een vloeiend rood→groen
// verloop willen over 5 stappen — primary/accent dekken slechts 3 hues.
const OPTIONS: readonly RatingOption[] = [
  { value: 1, label: 'Heel slecht', icon: Angry, color: '#d93a2c' },
  { value: 2, label: 'Matig', icon: Frown, color: '#e8742d' },
  { value: 3, label: 'Oké', icon: Meh, color: '#f5d547' },
  { value: 4, label: 'Goed', icon: Smile, color: '#a3d65c' },
  { value: 5, label: 'Top', icon: Laugh, color: '#7ac74f' },
];

export function MealRatingPicker({ value, onChange, className }: MealRatingPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Hoe goed is de AI-schatting?"
      className={cn('flex items-center justify-between gap-1', className)}
    >
      {OPTIONS.map(({ value: v, label, icon: Icon, color }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => onChange(v)}
            className={cn(
              'flex flex-1 items-center justify-center rounded-full p-2 transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              selected
                ? 'scale-110 ring-2 ring-offset-1 ring-offset-surface'
                : 'opacity-50 hover:opacity-100',
            )}
            style={{
              color,
              ...(selected ? { backgroundColor: `${color}1f`, boxShadow: `0 0 0 2px ${color}` } : {}),
            }}
          >
            <Icon className="h-7 w-7" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
