import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center gap-3 py-10 px-6', className)}>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <Icon size={22} aria-hidden />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
