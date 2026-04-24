import { ListChecks } from 'lucide-react';
import { AppHeader } from '@/widgets/app-shell';
import { EmptyState } from '@/shared/ui';

export default function MealsPage() {
  return (
    <>
      <AppHeader title="Maaltijden" />
      <main className="flex-1 px-4 py-10 mx-auto w-full max-w-2xl">
        <EmptyState
          icon={ListChecks}
          title="Nog geen maaltijden"
          description="Deze pagina komt in PR G. Voorlopig kun je alles via /admin beheren."
        />
      </main>
    </>
  );
}
