import { AppHeader } from '@/widgets/app-shell';
import { AddMealPhotoFlow } from '@/features/add-meal-photo';
import { ManualMealForm } from '@/features/add-meal-manual';
import { requireUser } from '@/shared/lib/auth-guard';

type AddMealPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

function titleFor(mode: string | undefined): string {
  if (mode === 'photo') return 'Foto-analyse';
  if (mode === 'manual') return 'Handmatig toevoegen';
  return 'Maaltijd toevoegen';
}

export default async function AddMealPage({ searchParams }: AddMealPageProps) {
  await requireUser();
  const { mode } = await searchParams;

  return (
    <>
      <AppHeader title={titleFor(mode)} back />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl">
        {mode === 'photo' ? <AddMealPhotoFlow /> : <ManualMealForm />}
      </main>
    </>
  );
}
