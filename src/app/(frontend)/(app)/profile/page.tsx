import { UserRound } from 'lucide-react';
import { AppHeader } from '@/widgets/app-shell';
import { EmptyState } from '@/shared/ui';

export default function ProfilePage() {
  return (
    <>
      <AppHeader title="Profiel" />
      <main className="flex-1 px-4 py-10 mx-auto w-full max-w-2xl">
        <EmptyState
          icon={UserRound}
          title="Profiel komt in PR H"
          description="Weergave + aanpassen van gewicht, lengte, activiteitenniveau en calorie-doel."
        />
      </main>
    </>
  );
}
