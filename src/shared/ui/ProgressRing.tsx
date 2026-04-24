import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  color?: string;
  trackColor?: string;
  className?: string;
  ariaLabel?: string;
};

export function ProgressRing({
  value,
  size = 140,
  stroke = 10,
  label,
  color = 'var(--color-primary-500)',
  trackColor = 'var(--color-primary-100)',
  className,
  ariaLabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      {label && <div className="absolute inset-0 flex items-center justify-center">{label}</div>}
    </div>
  );
}
