import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/shared/ui';
import { LoginForm } from '@/features/auth';
import { getCurrentUser } from '@/shared/lib/auth-guard';

const VERIFY_ERRORS: Record<string, string> = {
  verify_invalid: 'Deze verificatielink is ongeldig of al gebruikt.',
  verify_expired: 'Deze verificatielink is verlopen. Log in en vraag een nieuwe aan via de banner.',
};

type LoginPageProps = {
  searchParams: Promise<{ verified?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { verified, error } = await searchParams;
  const errorMessage = error ? VERIFY_ERRORS[error] : null;
  const hasVerifyFeedback = verified === '1' || Boolean(errorMessage);

  // Ingelogde users zonder verify-feedback meteen doorsturen. Mét feedback
  // (klikken op verify-link in zelfde browser) tonen we de banner zodat
  // ze acknowledgement zien en zelf naar het dashboard gaan.
  const user = await getCurrentUser();
  if (user && !hasVerifyFeedback) redirect('/');

  return (
    <Card className="w-full max-w-sm">
      {verified === '1' && (
        <div role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          E-mailadres bevestigd.
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {errorMessage}
        </div>
      )}
      {user ? (
        <p className="text-sm text-ink-muted">
          <Link href="/" className="text-primary-600 hover:underline">
            Doorgaan naar dashboard
          </Link>
        </p>
      ) : (
        <LoginForm />
      )}
    </Card>
  );
}
