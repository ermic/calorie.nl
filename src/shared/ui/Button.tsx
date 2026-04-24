import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode, Ref } from 'react';
import { cn } from '@/shared/lib/cn';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors select-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700',
        secondary:
          'bg-surface text-ink border border-ink/10 hover:border-ink/20 hover:bg-surface-muted',
        ghost: 'bg-transparent text-ink hover:bg-surface-muted',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonStyles> & {
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    children?: ReactNode;
    ref?: Ref<HTMLButtonElement>;
  };

export function Button({
  variant,
  size,
  fullWidth,
  icon: Icon,
  iconPosition = 'left',
  loading,
  disabled,
  className,
  children,
  ref,
  type = 'button',
  ...props
}: ButtonProps) {
  const iconSize = size === 'lg' ? 20 : 18;
  const renderedIcon = loading ? (
    <Loader2 size={iconSize} className="animate-spin" aria-hidden />
  ) : Icon ? (
    <Icon size={iconSize} aria-hidden />
  ) : null;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    >
      {iconPosition === 'left' && renderedIcon}
      {children}
      {iconPosition === 'right' && renderedIcon}
    </button>
  );
}
