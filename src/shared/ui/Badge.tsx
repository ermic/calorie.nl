import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

const badgeStyles = cva('inline-flex items-center gap-1 rounded-full font-medium', {
  variants: {
    variant: {
      neutral: 'bg-ink/5 text-ink',
      primary: 'bg-primary-100 text-primary-700',
      success: 'bg-accent-green/20 text-[#3f6d1e]',
      warning: 'bg-accent-yellow/25 text-[#8a6a12]',
      danger: 'bg-danger/10 text-danger',
      info: 'bg-accent-blue/20 text-[#0f6b8a]',
    },
    size: {
      sm: 'text-[11px] px-2 py-0.5',
      md: 'text-xs px-2.5 py-1',
    },
  },
  defaultVariants: { variant: 'neutral', size: 'md' },
});

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeStyles>;

export function Badge({ variant, size, className, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant, size }), className)} {...props} />;
}
