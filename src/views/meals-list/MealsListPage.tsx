import Link from 'next/link';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { AppHeader } from '@/widgets/app-shell';
import { EmptyState } from '@/shared/ui';
import { requireUser } from '@/shared/lib/auth-guard';
import { fetchMealsPage } from './fetch-meals';
import { MealsList } from './MealsList';

const INITIAL_PAGE_SIZE = 30;

export async function MealsListPage() {
  const user = await requireUser();
  const initialPage = await fetchMealsPage({ user, offset: 0, limit: INITIAL_PAGE_SIZE });

  return (
    <>
      <AppHeader title="Maaltijden" />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl space-y-6">
        {initialPage.meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nog geen maaltijden"
            description="Voeg je eerste maaltijd toe — handmatig of via foto-analyse."
            action={
              <Link
                href="/add-meal"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-600 text-white px-5 text-sm font-medium hover:bg-primary-700"
              >
                <Plus size={18} aria-hidden />
                Maaltijd toevoegen
              </Link>
            }
          />
        ) : (
          <MealsList initialPage={initialPage} timezone={user.timezone} />
        )}
      </main>
    </>
  );
}
