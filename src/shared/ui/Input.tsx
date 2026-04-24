import { useId, type ComponentProps, type ReactNode, type Ref } from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from './Label';

export type InputProps = Omit<ComponentProps<'input'>, 'prefix'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  id,
  className,
  ref,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint || error ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-surface px-3 h-11 transition-colors',
          'border-ink/15 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20',
          error && 'border-danger focus-within:border-danger focus-within:ring-danger/20',
        )}
      >
        {prefix && <span className="text-ink-muted text-sm">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          className={cn('flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted', className)}
          {...props}
        />
        {suffix && <span className="text-ink-muted text-sm">{suffix}</span>}
      </div>
      {(hint || error) && (
        <p id={hintId} className={cn('text-xs', error ? 'text-danger' : 'text-ink-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
