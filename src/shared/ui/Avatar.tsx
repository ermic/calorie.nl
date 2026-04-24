import { cn } from '@/shared/lib/cn';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

export type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
};

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const base = cn(
    'inline-flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-medium overflow-hidden',
    sizeMap[size],
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name ?? ''} className={base} />
    );
  }

  return (
    <span className={base} aria-label={name ?? undefined}>
      {initials(name)}
    </span>
  );
}
