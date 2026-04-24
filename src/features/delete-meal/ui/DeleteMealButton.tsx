'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Dialog } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/lib/api';
import { pushToast, useAppDispatch } from '@/shared/store';
import { useDeleteMeal } from '../api/useDeleteMeal';

export type DeleteMealButtonProps = {
  mealId: number;
  redirectTo?: string;
};

export function DeleteMealButton({ mealId, redirectTo = '/meals' }: DeleteMealButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const del = useDeleteMeal();

  const onConfirm = () => {
    setError(null);
    del.mutate(mealId, {
      onSuccess: () => {
        setOpen(false);
        dispatch(pushToast({ type: 'success', message: 'Maaltijd verwijderd' }));
        router.push(redirectTo);
        router.refresh();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, 'Verwijderen mislukt.'));
      },
    });
  };

  return (
    <>
      <Button variant="danger" icon={Trash2} onClick={() => setOpen(true)}>
        Verwijder
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!del.isPending) setOpen(next);
        }}
        title="Maaltijd verwijderen?"
        description="Dit kan niet ongedaan worden gemaakt."
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={del.isPending}>
              Annuleer
            </Button>
            <Button variant="danger" icon={Trash2} onClick={onConfirm} loading={del.isPending}>
              Verwijder
            </Button>
          </>
        }
      >
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </Dialog>
    </>
  );
}
