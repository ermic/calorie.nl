import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { cn } from '@/shared/lib/cn';

const iconButtonStyles = cva(
  'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-50',
  {
    variants: {
      variant: {
        ghost: 'text-ink hover:bg-surface-muted',
        solid: 'bg-primary-600 text-white hover:bg-primary-700',
        danger: 'text-danger hover:bg-danger/10',
      },
      size: {
        sm: 'h-9 w-9',
        md: 'h-11 w-11',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> &
  VariantProps<typeof iconButtonStyles> & {
    icon: LucideIcon;
    'aria-label': string;
    ref?: Ref<HTMLButtonElement>;
  };

export function IconButton({
  icon: Icon,
  variant,
  size,
  className,
  ref,
  type = 'button',
  ...props
}: IconButtonProps) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 22 : 20;
  return (
    <button ref={ref} type={type} className={cn(iconButtonStyles({ variant, size }), className)} {...props}>
      <Icon size={iconSize} aria-hidden />
    </button>
  );
}
