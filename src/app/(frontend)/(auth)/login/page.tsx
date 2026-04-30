import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/shared/ui';
import { LoginForm } from '@/features/auth';
import { getCurrentUser } from '@/shared/lib/auth-guard';

type LoginSearchParams = {
  verified?: string;
  email_changed?: string;
  email_change_revoked?: string;
  error?: string;
};

type Flag = { kind: 'success' | 'error'; text: string };

function getFlag(p: LoginSearchParams): Flag | null {
  if (p.verified === '1') return { kind: 'success', text: 'E-mailadres bevestigd.' };
  if (p.email_changed === '1')
    return { kind: 'success', text: 'E-mailadres gewijzigd. Log in met je nieuwe adres.' };
  if (p.email_change_revoked === '1')
    return { kind: 'success', text: 'De aangevraagde e-mailwijziging is ingetrokken.' };
  switch (p.error) {
    case 'verify_invalid':
      return { kind: 'error', text: 'Deze verificatielink is ongeldig of al gebruikt.' };
    case 'verify_expired':
      return {
        kind: 'error',
        text: 'Deze verificatielink is verlopen. Log in en vraag een nieuwe aan via de banner.',
      };
    case 'email_change_invalid':
      return { kind: 'error', text: 'Deze e-mailwijzigingslink is ongeldig of al gebruikt.' };
    case 'email_change_taken':
      return { kind: 'error', text: 'Het nieuwe e-mailadres is inmiddels in gebruik.' };
    default:
      return null;
  }
}

function Banner({ flag }: { flag: Flag }) {
  const cls =
    flag.kind === 'success'
      ? 'mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900'
      : 'mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900';
  return (
    <div role={flag.kind === 'success' ? 'status' : 'alert'} className={cls}>
      {flag.text}
    </div>
  );
}

type LoginPageProps = {
  searchParams: Promise<LoginSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const flag = getFlag(params);

  // Ingelogde users zonder feedback-flag meteen doorsturen. Mét flag
  // (klik op een verify-/email-change-link in zelfde browser) tonen we
  // de banner zodat ze acknowledgement zien en zelf doorklikken.
  const user = await getCurrentUser();
  if (user && !flag) redirect('/');

  return (
    <Card className="w-full max-w-sm">
      {flag && <Banner flag={flag} />}
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
