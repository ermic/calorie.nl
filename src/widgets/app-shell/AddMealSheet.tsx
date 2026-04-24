'use client';

import { Camera, PencilLine } from 'lucide-react';
import Link from 'next/link';
import { closeAddMealSheet, useAppDispatch, useAppSelector } from '@/shared/store';
import { Sheet, SheetBody, SheetHeader } from '@/shared/ui';

export function AddMealSheet() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.addMealSheetOpen);
  const close = () => dispatch(closeAddMealSheet());

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : close())} ariaLabel="Maaltijd toevoegen" side="bottom">
      <SheetHeader title="Maaltijd toevoegen" onClose={close} />
      <SheetBody className="grid grid-cols-2 gap-3 pt-2 pb-6">
        <Link
          href="/add-meal?mode=photo"
          onClick={close}
          className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-ink/10 p-4 hover:border-primary-500 hover:bg-primary-50 transition-colors"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <Camera size={22} aria-hidden />
          </span>
          <span className="text-sm font-medium">Foto</span>
          <span className="text-xs text-ink-muted text-center">AI herkent de maaltijd</span>
        </Link>
        <Link
          href="/add-meal?mode=manual"
          onClick={close}
          className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-ink/10 p-4 hover:border-primary-500 hover:bg-primary-50 transition-colors"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <PencilLine size={22} aria-hidden />
          </span>
          <span className="text-sm font-medium">Handmatig</span>
          <span className="text-xs text-ink-muted text-center">Voedingsmiddelen toevoegen</span>
        </Link>
      </SheetBody>
    </Sheet>
  );
}
