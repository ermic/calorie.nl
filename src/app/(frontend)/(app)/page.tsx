import Link from 'next/link';
import { AppHeader } from '@/widgets/app-shell';
import { Card } from '@/shared/ui';
import { LogoutButton } from '@/features/auth';
import { requireUser } from '@/shared/lib/auth-guard';

export default async function Home() {
  const user = await requireUser();
  const greetingName = user.name?.trim() || user.email;
  const isAdmin = user.role === 'admin';

  return (
    <>
      <AppHeader title="Calorie Tracker" />
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-2xl space-y-6">
        <Card>
          <h2 className="text-lg font-semibold">Hallo {greetingName}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Houd je dagelijkse calorieën bij — handmatig of met AI foto-herkenning.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex h-11 items-center rounded-full bg-primary-600 text-white px-5 text-sm font-medium hover:bg-primary-700"
              >
                Open admin
              </Link>
            )}
            <LogoutButton />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">Binnenkort</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>• PR D — dashboard (ring, recent meals, weekly trend)</li>
            <li>• PR E/F — maaltijd toevoegen (foto + handmatig)</li>
            <li>• PR G — maaltijd-overzicht + detail</li>
            <li>• PR H — profiel + calorie-doel</li>
          </ul>
        </Card>
      </main>
    </>
  );
}
