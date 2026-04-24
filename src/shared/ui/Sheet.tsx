'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { IconButton } from './IconButton';

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'bottom' | 'right';
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export function Sheet({ open, onOpenChange, side = 'bottom', children, ariaLabel, className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
      const first = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, textarea, select');
      first?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = originalOverflow;
      previousActive?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  const panelClasses = cn(
    'fixed z-50 bg-surface shadow-[var(--shadow-sheet)] outline-none',
    side === 'bottom' &&
      'left-0 right-0 bottom-0 rounded-t-[var(--radius-card)] max-h-[90vh] pb-[var(--safe-bottom,0px)]',
    side === 'right' && 'top-0 right-0 bottom-0 w-[min(360px,85vw)] rounded-l-[var(--radius-card)]',
    className,
  );

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={panelClasses}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHeader({
  title,
  onClose,
  children,
}: {
  title?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="text-base font-semibold">{title ?? children}</div>
      {onClose && <IconButton icon={X} aria-label="Sluiten" onClick={onClose} size="sm" />}
    </div>
  );
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 pb-4 overflow-y-auto', className)}>{children}</div>;
}

export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 border-t border-ink/10 flex items-center justify-end gap-2', className)}>
      {children}
    </div>
  );
}
