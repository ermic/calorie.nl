import Link from 'next/link';
import { AppHeader } from '@/widgets/app-shell';
import { Card } from '@/shared/ui';
import { ChangeEmailForm, ChangePasswordForm, LogoutButton } from '@/features/auth';
import { ApiKeyCard, ProfileForm } from '@/features/update-profile';
import { GoalForm } from '@/features/set-daily-goal';
import { AuthMethodsSection } from '@/widgets/auth-methods-section';
import { DeleteAccountSection } from '@/widgets/delete-account-section';
import { requireUser } from '@/shared/lib/auth-guard';

export async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <AppHeader title="Profiel" />
      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-2xl space-y-5">
        <Card padded className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-lg font-semibold">
            {(user.name?.trim() || user.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user.name?.trim() || user.email}</p>
            <p className="text-xs text-ink-muted truncate">{user.email}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 text-ink-muted">{user.plan}</span>
        </Card>

        <GoalForm user={user} />
        <ProfileForm user={user} />
        <ApiKeyCard />

        {user.hasPassword && (
          <Card padded>
            <ChangePasswordForm />
          </Card>
        )}

        {user.hasPassword && (
          <Card padded>
            <ChangeEmailForm />
          </Card>
        )}

        <Card padded>
          <AuthMethodsSection />
        </Card>

        <Card padded>
          <DeleteAccountSection />
        </Card>

        <div className="flex justify-center pt-2">
          <LogoutButton />
        </div>

        <p className="text-center text-xs text-ink-muted">
          <Link href="/disclaimer" className="hover:underline">
            Disclaimer
          </Link>
        </p>
      </main>
    </>
  );
}
