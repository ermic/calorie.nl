import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type CardProps<T extends ElementType = 'div'> = {
  as?: T;
  padded?: boolean;
  interactive?: boolean;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children'>;

export function Card<T extends ElementType = 'div'>({
  as,
  padded = true,
  interactive = false,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      className={cn(
        'bg-surface rounded-[var(--radius-card)] shadow-[var(--shadow-card)]',
        padded && 'p-4',
        interactive && 'cursor-pointer transition-shadow hover:shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
