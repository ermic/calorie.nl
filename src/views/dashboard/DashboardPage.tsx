import Link from 'next/link';
import { AppHeader } from '@/widgets/app-shell';
import { LogoutButton } from '@/features/auth';
import { requireUser } from '@/shared/lib/auth-guard';
import { TodayOverview } from '@/widgets/today-overview';
import { RecentMeals } from '@/widgets/recent-meals';
import { WeeklyTrend } from '@/widgets/weekly-trend';

export async function DashboardPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const greetingName = user.name?.trim() || user.email.split('@')[0];

  return (
    <>
      <AppHeader title={`Hallo ${greetingName}`} />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl space-y-5">
        <TodayOverview user={user} />
        <RecentMeals user={user} />
        <WeeklyTrend user={user} />
        <div className="flex items-center justify-between gap-3 pt-2">
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex h-9 items-center rounded-full bg-primary-600 text-white px-4 text-xs font-medium hover:bg-primary-700"
            >
              Open admin
            </Link>
          ) : (
            <span />
          )}
          <LogoutButton />
        </div>
      </main>
    </>
  );
}
