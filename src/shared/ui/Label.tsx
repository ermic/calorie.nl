import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-ink', className)} {...props} />;
}
