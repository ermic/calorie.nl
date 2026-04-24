'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, actions, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const previousActive = document.activeElement as HTMLElement | null;
    const body = document.body;
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    queueMicrotask(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, textarea');
      first?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = originalOverflow;
      previousActive?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-sm bg-surface rounded-[var(--radius-card)] shadow-2xl p-5 outline-none',
          className,
        )}
      >
        {title && (
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
        )}
        {description && (
          <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
            {description}
          </p>
        )}
        {children && <div className="mt-3">{children}</div>}
        {actions && <div className="mt-5 flex items-center justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
