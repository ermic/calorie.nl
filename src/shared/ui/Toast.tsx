'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { dismissToast, useAppDispatch, useAppSelector, type Toast, type ToastType } from '@/shared/store';
import { cn } from '@/shared/lib/cn';

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: 'border-l-[color:var(--color-accent-green)]',
  error: 'border-l-danger',
  info: 'border-l-[color:var(--color-accent-blue)]',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const id = window.setTimeout(() => dispatch(dismissToast(toast.id)), 4000);
    return () => window.clearTimeout(id);
  }, [dispatch, toast.id]);

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-xl bg-surface shadow-[var(--shadow-card)] border-l-4 p-3 pr-2 min-w-[260px] max-w-sm',
        COLORS[toast.type],
      )}
    >
      <Icon size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
      <div className="flex-1 text-sm text-ink">{toast.message}</div>
      <button
        type="button"
        aria-label="Sluiten"
        onClick={() => dispatch(dismissToast(toast.id))}
        className="text-ink-muted hover:text-ink"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div
      role="region"
      aria-label="Notificaties"
      aria-live="polite"
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-auto"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}
