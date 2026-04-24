import { Camera } from 'lucide-react';
import { AppHeader } from '@/widgets/app-shell';
import { EmptyState } from '@/shared/ui';

export default function AddMealPage() {
  return (
    <>
      <AppHeader title="Maaltijd toevoegen" back />
      <main className="flex-1 px-4 py-10 mx-auto w-full max-w-2xl">
        <EmptyState
          icon={Camera}
          title="Toevoegen komt in PR E / F"
          description="Foto-flow met AI en handmatig toevoegen met food-search."
        />
      </main>
    </>
  );
}
