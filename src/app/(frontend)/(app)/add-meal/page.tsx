import { PencilLine } from 'lucide-react';
import { AppHeader } from '@/widgets/app-shell';
import { EmptyState } from '@/shared/ui';
import { AddMealPhotoFlow } from '@/features/add-meal-photo';
import { requireUser } from '@/shared/lib/auth-guard';

type AddMealPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function AddMealPage({ searchParams }: AddMealPageProps) {
  await requireUser();
  const { mode } = await searchParams;

  return (
    <>
      <AppHeader
        title={mode === 'photo' ? 'Foto-analyse' : 'Maaltijd toevoegen'}
        back
      />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl">
        {mode === 'photo' ? (
          <AddMealPhotoFlow />
        ) : (
          <EmptyState
            icon={PencilLine}
            title="Handmatig toevoegen komt in PR F"
            description="Food-search + handmatige invoer. Tot die tijd kun je via Foto-analyse een maaltijd toevoegen."
          />
        )}
      </main>
    </>
  );
}
