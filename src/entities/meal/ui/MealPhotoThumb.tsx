'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import { safeImageSrc } from '../lib/photo-url';

export type MealPhotoThumbProps = {
  src: string | null | undefined;
  className?: string;
};

export function MealPhotoThumb({ src, className }: MealPhotoThumbProps) {
  const [open, setOpen] = useState(false);
  const safe = safeImageSrc(src);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const body = document.body;
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!safe) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Bekijk foto"
        className={cn(
          'h-10 w-10 shrink-0 rounded-[var(--radius-card)] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safe}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[10px] p-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Maaltijd-foto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safe}
              alt=""
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded-[var(--radius-card)] object-contain"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
