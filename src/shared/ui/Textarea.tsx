import { useId, type ComponentProps, type ReactNode, type Ref } from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from './Label';

export type TextareaProps = ComponentProps<'textarea'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ label, hint, error, id, className, ref, ...props }: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const hintId = hint || error ? `${textareaId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={textareaId}>{label}</Label>}
      <textarea
        ref={ref}
        id={textareaId}
        aria-describedby={hintId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'rounded-xl border bg-surface px-3 py-2 text-base sm:text-sm outline-none resize-y min-h-[88px]',
          'border-ink/15 placeholder:text-ink-muted',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className,
        )}
        {...props}
      />
      {(hint || error) && (
        <p id={hintId} className={cn('text-xs', error ? 'text-danger' : 'text-ink-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
