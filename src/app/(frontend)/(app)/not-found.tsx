import Link from 'next/link';
import { ListChecks, MapPinOff } from 'lucide-react';
import { AppHeader } from '@/widgets/app-shell';
import { EmptyState } from '@/shared/ui';

// Geldt voor alle routes binnen de (app)-laag, dus ook /meals/<bogus-id>
// of /profile sub-routes die niet bestaan. Behoudt de AppShell met
// BottomNav zodat user gewoon ergens anders heen kan, in plaats van
// Next's default 404-pagina te zien.
export default function AppNotFound() {
  return (
    <>
      <AppHeader title="Niet gevonden" back />
      <main className="flex-1 px-4 py-10 mx-auto w-full max-w-2xl">
        <EmptyState
          icon={MapPinOff}
          title="Deze pagina bestaat niet"
          description="De link is mogelijk verlopen of de maaltijd is verwijderd."
          action={
            <Link
              href="/meals"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-600 text-white px-5 text-sm font-medium hover:bg-primary-700"
            >
              <ListChecks size={18} aria-hidden />
              Naar maaltijden
            </Link>
          }
        />
      </main>
    </>
  );
}
