import { useId, type ComponentProps, type ReactNode, type Ref } from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from './Label';

export type SelectProps = ComponentProps<'select'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
};

export function Select({ label, hint, error, id, className, ref, children, ...props }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = hint || error ? `${selectId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={selectId}>{label}</Label>}
      <select
        ref={ref}
        id={selectId}
        aria-describedby={hintId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 rounded-xl border bg-surface px-3 text-sm outline-none',
          'border-ink/15',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {(hint || error) && (
        <p id={hintId} className={cn('text-xs', error ? 'text-danger' : 'text-ink-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
